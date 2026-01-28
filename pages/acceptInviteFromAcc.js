import { popup, loadPageAndScript } from "../script.js";
export async function init() {
    console.log('accept acc invite');
    let params = new URLSearchParams(document.location.search);
    let code=params.get('code') || null;        
    const sessionRes = await fetch(apiUrl+'/auth/session', {method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json' }})
    const session = await sessionRes.json();
    if (session.authenticated) {
        document.getElementById('userLoggedIn').classList.remove('restricted-disable');
        const res = await fetch(apiUrl+'/db/acceptAccInvite', {method: 'POST', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ code: code })})
        const response = await res.json();
        if (response.success) {
            popup('Invitation accepted!')
            document.getElementById('infoLoggedIn').innerHTML = 'Invitation accepted! If you are not redirected please click the button below.'
            await loadPageAndScript('/pages/dashboard.html');
        } else {
            document.getElementById('infoLoggedIn').innerHTML = 'Sorry, we could not find the invitation. It might have expired.'
            popup('Sorry, we could not find the invitation. It might have expired.')
        }
    } else {
        const checkRes = await fetch(apiUrl+'/db/checkInviteFromAcc', { method: 'POST', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ code: code })});
        const check = await checkRes.json();
        if (check.client) {
            document.getElementById('userNotLoggedIn').classList.remove('restricted-disable');            
        } else {
            document.getElementById('noUser').classList.remove('restricted-disable');
        }
    }

}