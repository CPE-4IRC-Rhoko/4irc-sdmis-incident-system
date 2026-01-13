declare module 'event-source-polyfill' {
  export interface EventSourcePolyfillInit extends EventSourceInit {
    headers?: Record<string, string>
    // Time in ms before considering the stream idle and reconnecting.
    heartbeatTimeout?: number
  }

  export class EventSourcePolyfill extends EventSource {
    constructor(url: string | URL, eventSourceInitDict?: EventSourcePolyfillInit)
  }
}
