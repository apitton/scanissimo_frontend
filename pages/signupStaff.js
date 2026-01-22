import { popup, loadPageAndScript } from '../script.js';
import { checkPasswd, passwdCheckReset } from './signup.js';

export async function init() {
    //check if logged in    
    document.getElementById('verifEmail').addEventListener('submit', handleSubmitEmail);      
}

async function handleSubmitEmail(e) {
    e.preventDefault();
    console.log('done')
    let params = new URLSearchParams(document.location.search);
    const invite_code = params.get('code');
    console.log('code ', invite_code);
    document.getElementById('code').value = invite_code;
    document.getElementById('inviteCode').value = invite_code;
    const formdata=new FormData(e.target);
    const reply = await fetch('/auth/checkStaffInvited', { method: 'POST', body: formdata});
    const response = await reply.json();  
    if (response.success) {
        document.getElementById('wait').classList.add('restricted-disable');
        document.getElementById('verified').classList.remove('restricted-disable');
        initializeForm();    
        //loadPageAndScript('pages/dashboard.html');
    } else {
        popup('Error: ' + response.error);
    }
    
}

function initializeForm() {
    ['pass', 'confirmPass'].forEach((el)=>document.getElementById(el).addEventListener("keyup",()=>{
        let passwordChecked=false;
        passwdCheckReset();
        const isPasswdOk = checkPasswd();
        //console.log('ispasswdok', isPasswdOk);
        if (isPasswdOk[0]) {
            document.getElementById('pass-valid-msg').classList.remove('hide');
            passwordChecked=true;
            document.getElementById(submitButton).disable=false;
        } else {
            if ((!isPasswdOk[1])) {
                document.getElementById('pass-error-msg').classList.remove('hide');
            }
            if (!isPasswdOk[2]) {
                document.getElementById('passwordExplain').classList.add('text-danger');
            }
        }    
    }))
    document.getElementById('newStaffPassword').addEventListener('submit',(e)=>{
        const formdata=new FormData(e.target);
        fetch('/auth/StaffInvitedPassword', { method: 'POST', body: formdata })
        .then((res)=>res.json()).then((response)=>{
            if (response.id) {
                if (response.loggedIn) return loadPageAndScript('/pages/missingInfo.html');
                return loadPageAndScript('/pages/login.html');
            } else {
                popup('There was a problem');
            }
        })
    })

}