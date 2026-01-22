import { routeNextPage } from './login.js'
import { popup, toogleLogin } from '../script.js';

export function init() {
    console.log('mfa');
    document.getElementById('mfaCode').addEventListener('input', function () {
                            this.value = this.value.replace(/\D/g, '');
                            if (this.value.length>6) this.value=this.value.slice(0,6);
                            if (this.value.length==6) {
                                document.getElementById('mfaCodeSubmit').classList.remove('disabled');
                            } else {
                                document.getElementById('mfaCodeSubmit').classList.add('disabled');
                            } })
    document.getElementById('mfa').addEventListener('submit',submitMfa);
    return fetch('auth/session', {method: 'GET', credentials: 'include', headers: {'Content-Type':'application/json'}})
            .then((reply)=>reply.json())
            .then((response)=>console.log(response));
}

function submitMfa(e) {
    e.preventDefault();
    const formData = new FormData(mfa);
    fetch('/auth/mfa', {method: 'POST', credentials: 'include', body: formData})
    .then((reply)=>reply.json())
    .then((data)=>{        
        console.log('login response: ',data );        
        if (data.error) {
            document.getElementById('mfaError').innerHTML=data.error;
            document.getElementById('mfaError').classList.add('text-danger');
            popup(data.error);
        } else {
            console.log('success');
            return fetch('auth/session', {method: 'GET', credentials: 'include', headers: {'Content-Type':'application/json'}})
            .then((reply)=>reply.json())
            .then((response)=>{
                console.log(response)
                toogleLogin('login');
                routeNextPage();
            });

            
        }
    })
}
