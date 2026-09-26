import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

function Chat({ pairId, currentUserId, partnerName }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchMessages()

    const subscription = supabase
      .from('messages')
      .on('*', (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages((prev) => [...prev, payload.new])
        }
      })
      .eq('pair_id', pairId)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [pairId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('pair_id', pairId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      const { error } = await supabase.from('messages').insert({
        pair_id: pairId,
        sender_id: currentUserId,
        content: newMessage,
      })

      if (error) throw error
      setNewMessage('')
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div>Loading messages...</div>
  }

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', paddingTop: '40px' }}>
            Start a conversation with {partnerName}
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="message-item">
              <div className="message-sender">
                {msg.sender_id === currentUserId ? 'You' : partnerName}
              </div>
              <div className="message-content">{msg.content}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit" className="primary">
          Send
        </button>
      </form>
    </div>
  )
}

export default Chat
