package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
	appsv1 "k8s.io/api/apps/v1" // Import apps/v1 for Deployment resources
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"path/filepath"
	"k8s.io/client-go/informers"
)

func getKubernetesClient() (*kubernetes.Clientset, error) {
	// Determine kubeconfig path
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homedir.HomeDir(); home != "" {
			kubeconfig = filepath.Join(home, ".kube", "config")
		} else {
			return nil, fmt.Errorf("cannot determine kubeconfig location")
		}
	}

	// Build the Kubernetes client
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to build kubeconfig: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	return clientset, nil
}

func handleDeployments(clientset *kubernetes.Clientset) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set headers for SSE
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		// Context to cancel the informer when the client disconnects
		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()

		// Create shared informer for deployments
		factory := informers.NewSharedInformerFactory(clientset, time.Minute)
		informer := factory.Apps().V1().Deployments().Informer()

		informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
			AddFunc: func(obj interface{}) {
				deployment := obj.(*appsv1.Deployment)
				message := fmt.Sprintf("ADDED: %s/%s\n", deployment.Namespace, deployment.Name)
				fmt.Fprintf(w, "data: %s\n\n", message)
				w.(http.Flusher).Flush()
			},
			UpdateFunc: func(oldObj, newObj interface{}) {
				deployment := newObj.(*appsv1.Deployment)
				message := fmt.Sprintf("UPDATED: %s/%s\n", deployment.Namespace, deployment.Name)
				fmt.Fprintf(w, "data: %s\n\n", message)
				w.(http.Flusher).Flush()
			},
			DeleteFunc: func(obj interface{}) {
				deployment := obj.(*appsv1.Deployment)
				message := fmt.Sprintf("DELETED: %s/%s\n", deployment.Namespace, deployment.Name)
				fmt.Fprintf(w, "data: %s\n\n", message)
				w.(http.Flusher).Flush()
			},
		})

		// Start the informer in a separate goroutine
		go informer.Run(ctx.Done())

		// Wait for the client to disconnect
		<-ctx.Done()
		log.Println("Client disconnected from /deployments")
	}
}

func main() {
	clientset, err := getKubernetesClient()
	if err != nil {
		log.Fatalf("Error creating Kubernetes client: %v", err)
	}

	http.HandleFunc("/deployments", handleDeployments(clientset))

	log.Println("Starting server on :8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
