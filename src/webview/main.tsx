import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createClient } from './client';
import { getVsCodeApi } from './vscodeApi';
import './main.css';

const api = getVsCodeApi();
const client = createClient({
    post: (message) => api.postMessage(message),
    reloaded: document.body.dataset.reloaded === 'true',
});
const mountPoint = document.getElementById('root');
if (mountPoint !== null) {
    createRoot(mountPoint).render(<App client={client} />);
}
client.start();
