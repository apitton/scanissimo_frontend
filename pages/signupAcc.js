import { popup, loadPageAndScript } from '../script.js';
export function init() {
    //check if logged in
    let params = new URLSearchParams(document.location.search);
    const invite_code = params.get('code');
    fetch('/auth/acceptAccountantInvited', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ invite_code: invite_code })})
    .then((reply)=>reply.json())
    .then((response)=>{
        if (response.success) {
            popup('Invitation accepted!');
            loadPageAndScript('pages/dashboard.html');
        }
    })
        
}