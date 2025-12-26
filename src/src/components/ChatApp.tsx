import { useState } from 'react';
import { Header } from './Header';
import { SendMessage } from './SendMessage';
import { Inbox } from './Inbox';
import '../styles/ChatApp.css';

export function ChatApp() {
  const [activeTab, setActiveTab] = useState<'send' | 'inbox'>('send');

  return (
    <div className="chat-app">
      <Header />
      <main className="chat-main">
        <div className="chat-shell">
          <div className="tab-navigation">
            <nav className="tab-nav">
              <button
                onClick={() => setActiveTab('send')}
                className={`tab-button ${activeTab === 'send' ? 'active' : 'inactive'}`}
                type="button"
              >
                Send
              </button>
              <button
                onClick={() => setActiveTab('inbox')}
                className={`tab-button ${activeTab === 'inbox' ? 'active' : 'inactive'}`}
                type="button"
              >
                Inbox
              </button>
            </nav>
          </div>

          {activeTab === 'send' && <SendMessage />}
          {activeTab === 'inbox' && <Inbox />}
        </div>
      </main>
    </div>
  );
}

