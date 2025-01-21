import { useEffect, useState } from 'react';

export default function Deployments() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const eventSource = new EventSource(`${backendUrl}/deployments`);

    eventSource.onmessage = (event) => {
      setEvents((prevEvents) => [...prevEvents, event.data]);
    };

    eventSource.onerror = () => {
      console.error('Error connecting to SSE endpoint.');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      <h1>Deployment Events</h1>
      <ul>
        {events.map((event, index) => (
          <li key={index}>{event}</li>
        ))}
      </ul>
    </div>
  );
}
