'use client';

import { useEffect, useState } from "react";
import Image from "next/image";

interface DeploymentEvent {
  name: string;
  status: string;
}

export default function Home() {
  const [events, setEvents] = useState<DeploymentEvent[]>([]);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8080/deployments");

    eventSource.onmessage = (event) => {
      const newEvent: DeploymentEvent = JSON.parse(event.data);
      setEvents((prevEvents) => {
        const existingEventIndex = prevEvents.findIndex(e => e.name === newEvent.name);
        if (existingEventIndex !== -1) {
          // Update the status of the existing event
          const updatedEvents = [...prevEvents];
          updatedEvents[existingEventIndex].status = newEvent.status;
          return updatedEvents;
        } else {
          // Add the new event
          return [...prevEvents, newEvent];
        }
      });
    };

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <div className="mb-2">
            Realtime list of deployments:
          </div>
          <ol>
            {events.map((event, index) => (
              <li key={index}>{event.name} - {event.status}</li>
            ))}
          </ol>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
