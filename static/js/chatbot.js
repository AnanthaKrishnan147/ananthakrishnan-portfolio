const form = document.querySelector('#chat-form');
const input = document.querySelector('#chat-input');
const messages = document.querySelector('#chat-messages');
const sendButton = form?.querySelector('button[type="submit"]');
const status = document.querySelector('#chat-status');
const defaultGreeting = 'Hi! Ask me about Anantha’s profile and projects, or ask a general question.';
let isSending = false;

const greetingTime = messages?.querySelector('.assistant-message .message-time');
if (greetingTime) {
  greetingTime.dateTime = new Date().toISOString();
  greetingTime.textContent = timestamp();
}

function timestamp() {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

function addMessage(text, role, { typing = false, sources = [] } = {}) {
  const row = document.createElement('div');
  row.className = `message ${role}-message${typing ? ' typing' : ''}`;
  if (role === 'assistant') {
    const avatar = document.createElement('span');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AK';
    row.append(avatar);
  }
  const content = document.createElement('div');
  content.className = 'message-content';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  const time = document.createElement('time');
  time.className = 'message-time';
  time.dateTime = new Date().toISOString();
  time.textContent = timestamp();
  content.append(bubble);
  if (sources.length) {
    const sourceList = document.createElement('div');
    sourceList.className = 'message-sources';
    sourceList.textContent = `Source: ${[...new Set(sources.map((source) => source.label))].join(', ')}`;
    content.append(sourceList);
  }
  content.append(time);
  row.append(content);
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
  return row;
}

async function ask(rawQuestion) {
  const question = rawQuestion.trim();
  if (!question || isSending) return;
  isSending = true;
  addMessage(question, 'user');
  const pending = addMessage('Thinking', 'assistant', { typing: true });
  input.disabled = true;
  sendButton.disabled = true;
  status.textContent = 'CONNECTING TO THE ASSISTANT…';
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question }),
      signal: controller.signal
    });
    let data;
    try { data = await response.json(); } catch { throw new Error('The server returned an unreadable response. Please try again.'); }
    if (!response.ok) throw new Error(data.detail || 'The assistant could not answer that right now. Please try again.');
    pending.querySelector('.bubble').textContent = data.answer || 'I did not receive an answer. Please try again.';
    if (data.sources?.length) {
      const list = document.createElement('div');
      list.className = 'message-sources';
      list.textContent = `Profile sources: ${[...new Set(data.sources.map((source) => source.label))].join(', ')}`;
      pending.querySelector('.message-content').insertBefore(list, pending.querySelector('.message-time'));
    }
    pending.classList.remove('typing');
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'That took too long. Please try again.'
      : error instanceof TypeError
        ? 'The assistant is unavailable. Check that the FastAPI server is running, then try again.'
        : error.message;
    pending.querySelector('.bubble').textContent = message;
    pending.classList.remove('typing');
    pending.classList.add('message-error');
  } finally {
    window.clearTimeout(timeout);
    input.disabled = false;
    sendButton.disabled = false;
    status.textContent = 'ENTER TO SEND · SHIFT + ENTER FOR NEW LINE';
    isSending = false;
    input.focus();
    messages.scrollTop = messages.scrollHeight;
  }
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const question = input.value;
  if (!question.trim()) return;
  input.value = '';
  input.style.height = 'auto';
  ask(question);
});

input?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
input?.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
});

document.querySelectorAll('.suggested-questions button').forEach((button) => button.addEventListener('click', () => ask(button.textContent)));
document.querySelector('#clear-chat')?.addEventListener('click', () => {
  if (isSending) return;
  messages.replaceChildren();
  addMessage(defaultGreeting, 'assistant');
  input.focus();
});
