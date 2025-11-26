"use client"

import { useEffect, useRef, useCallback, useState } from "react"

interface WebSocketMessage {
  type: string
  [key: string]: any
}

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [data, setData] = useState<WebSocketMessage | null>(null)
  const ws = useRef<WebSocket | null>(null)
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map())

  const send = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
    }
  }, [])

  const on = useCallback((messageType: string, handler: (data: any) => void) => {
    messageHandlers.current.set(messageType, handler)
    return () => messageHandlers.current.delete(messageType)
  }, [])

  useEffect(() => {
    const connect = () => {
      try {
        ws.current = new WebSocket(url)

        ws.current.onopen = () => setIsConnected(true)
        ws.current.onclose = () => setIsConnected(false)

        ws.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            setData(message)
            const handler = messageHandlers.current.get(message.type)
            if (handler) handler(message)
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err)
          }
        }

        ws.current.onerror = (err) => {
          console.error("WebSocket error:", err)
        }
      } catch (err) {
        console.error("WebSocket connection failed:", err)
      }
    }

    connect()

    return () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close()
      }
    }
  }, [url])

  return { isConnected, send, on, data }
}
