import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

function Chat({ pairId, currentUserId, partnerName }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const fetchMessages = async () => {
      const { data, error: fetchErr } = await supabase
        .from('messages')
        .select('*')
        .eq('pair_id', pairId)
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (fetchErr) {
        setError(fetchErr.message)
      } else {
        setMessages(data || [])
      }
      setLoading(false)
    }

    fetchMessages()

    const channel = supabase
      .channel(`chat-${pairId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `pair_id=eq.${pairId}` },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]
          )
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [pairId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    const content = newMessage.trim()
    if (!content) return
    setSending(true)
    setError('')

    try {
      const { data, error: insErr } = await supabase
        .from('messages')
        .insert({ pair_id: pairId, sender_id: currentUserId, content })
        .select()
        .single()

      if (insErr) throw insErr
      // Show immediately; realtime will not duplicate it thanks to the id check
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]))
      setNewMessage('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <div>Loading messages...</div>
  }

  return (
    <div className="chat-box">
      {error && <div className="message error">{error}</div>}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', paddingTop: '40px' }}>
            Start a conversation with {partnerName}
          </p>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={`message-item ${mine ? 'mine' : 'theirs'}`}>
                <div className="message-sender">
                  {mine ? 'You' : partnerName}
                  <span className="message-time">
                    {new Date(msg.created_at).toLocaleString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          maxLength={2000}
        />
        <button type="submit" className="primary" disabled={sending || !newMessage.trim()}>
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default Chat
