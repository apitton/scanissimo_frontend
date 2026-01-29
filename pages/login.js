import { loadPageAndScript, toogleLogin } from "../script.js";
console.log('login.js')
export function init() {
    document.getElementById('email').addEventListener("keyup", ()=> {trackInput()});
    document.getElementById('password').addEventListener("keyup", ()=> {trackInput()});
    document.getElementById('loginForm').addEventListener('submit', handleSubmit);
    document.getElementById('google').addEventListener('click', googleSSO);
    document.getElementById('apple').addEventListener('click', handleSubmit);
    document.getElementById('facebook').addEventListener('click', handleSubmit);
    document.getElementById('mfaCode').addEventListener('input', function () {
                            this.value = this.value.replace(/\D/g, '');
                            if (this.value.length>6) this.value=this.value.slice(0,6);
                            if (this.value.length==6) {
                                document.getElementById('mfaCodeSubmit').classList.remove('disabled');
                            } else {
                                document.getElementById('mfaCodeSubmit').classList.add('disabled');
                            } })
    document.getElementById('mfaForm').addEventListener('submit',submitMfa);
    return 'done';}
function handleSubmit(e) {
    e.preventDefault();
    console.log('submitting login form');
    const formdata = new FormData(e.target);
    return fetch(apiUrl+'./auth/login', {method: 'POST', credentials: 'include', body: formdata})
    .then((res)=> {return res.json()})
    .then((data)=>{
        console.log('login response: ',data );        
        if (data.error) {
            document.getElementById('loginError').innerHTML=data.error;
        } else if (data.mfa_required) {   
            console.log('mfa required')
            document.getElementById('default').classList.add('restricted-disable');
            document.getElementById('mfa').classList.remove('restricted-disable');
            document.getElementById('mfaBox').classList.add('border', 'boxShadow', 'rounded');
            document.getElementById('localLogin').classList.add('restricted-disable')
            document.getElementById('sso').classList.add('restricted-disable')
            //return loadPageAndScript('./pages/mfa.html')
        } else {
            //check if subscription or free trial for that user
            toogleLogin('login');        
            //check if there was a redirect to login from another page
            const params = new URLSearchParams(document.location.search);
            let page = params.get('page')            ;
            routeNextPage(page);
            //.then((res)=>linksEventListeners('span.link'));                    
        } } )
    .catch(error=>console.log('Login error: ',error))
    
}

export function routeNextPage(pageAskedFor) {
    return fetch(apiUrl+'/stripe/check-status', {method: 'GET', credentials: 'include'})
        .then(reply=>reply.json())
        .then((response)=>{
            let nextPage;
            console.log('response status ', response.status, 'page asked for ', pageAskedFor);
            switch (response.status) {
                case 'accountant':
                    document.getElementById('alert').innerHTML = 'You are logged in as an accountant. In order to upload receipts, please&nbsp;<span data-link="/pages/subscription.html" class="link blue">subscribe</span>&nbsp;or start a free trial.'                                    
                    document.getElementById('alert').classList.remove('restricted-disable');
                    console.log('accountant');
                    nextPage = pageAskedFor || '/pages/dashboard.html';
                    break;
                case 'trial':                                    
                    document.getElementById('alert').innerHTML = `You are currently on a free trial ending on the ${response.endDate}. Click <span data-link="/pages/subscription.html" class="link blue">here</span> to switch to a subscription.`;
                    document.getElementById('alert').classList.remove('restricted-disable');
                    console.log('trial');
                    nextPage = pageAskedFor || '/pages/dashboard.html';
                    break;
                case 'subscribed':
                    console.log('subscribed');
                    document.getElementById('alert').classList.add('restricted-disable');
                    nextPage = pageAskedFor || '/pages/dashboard.html';
                    break;
                case 'infoMissing':
                    console.log('info missing');
                    nextPage = `/pages/missingInfo.html`;
                    break;                
                default:
                    console.log('response.status: ', response.status)                                        
                    if (pageAskedFor === '/pages/signupAcc.html') {                        
                        nextPage = pageAskedFor; 
                    } else {
                        nextPage = '/pages/subscription.html';
                    }
            }
            console.log('next page', nextPage);            
            return loadPageAndScript(nextPage); }) 
}

function fetchCredentials(e) {
    switch (e.target.id) {
        case 'loginForm':
            const formdata = new FormData(e.target);
            return fetch(apiUrl+'./auth/login', {method: 'POST', credentials: 'include', body: formdata});
        case 'google':
            return fetch(apiUrl+'./auth/google', {method: 'GET', headers: {'Content-Type':'Application/json', 'Access-Control-Allow-Origin': '*'}} )  
        case 'apple':
            return fetch(apiUrl+'./auth/apple', {method: 'GET', headers: {'Content-Type':'Application/json'}} )  
        case 'facebook':
            return fetch(apiUrl+'./auth/facebook', {method: 'GET', headers: {'Content-Type':'Application/json'}} )  
    }
}

function googleSSO() {
    window.location.href='http://localhost:3000/auth/google';
}

function trackInput() {
    if (document.getElementById("email").value!="" && document.getElementById("password").value!="") {
        //console.log('both filled');
        //console.log(document.getElementById("email"))
        document.getElementById("loginButton").disabled=false;        
    }
    if (document.getElementById("email").value=="" | document.getElementById("password").value=="") {
        document.getElementById("loginButton").disabled=true;
        //console.log('one empty');
    }
    //console.log('email ', document.getElementById('email').value);
    //console.log('password ',document.getElementById('password').value); 
    }

function submitMfa(e) {
    e.preventDefault();
    const formData = new FormData(mfaForm);
    fetch(apiUrl+'/auth/mfa', {method: 'POST', credentials: 'include', body: formData})
    .then((reply)=>reply.json())
    .then((data)=>{        
        console.log('login response: ',data );        
        if (data.error) {
            document.getElementById('mfaError').innerHTML=data.error;
            document.getElementById('mfaError').classList.add('text-danger');
            popup(data.error);
        } else {
            console.log('success');
            return fetch(apiUrl+'auth/session', {method: 'GET', credentials: 'include', headers: {'Content-Type':'application/json'}})
            .then((reply)=>reply.json())
            .then((response)=>{
                console.log(response)
                toogleLogin('login');
                routeNextPage();
            });

            
        }
    })
}