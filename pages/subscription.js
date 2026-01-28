export function init() {
    console.log('subscription script');
    checkSession().then((response)=>console.log('session: ',response));
    /*let searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('session_id')) {
        const session_id = searchParams.get('session_id');
        document.getElementById('session-id').setAttribute('value', session_id);} */
    const createCheckoutSession = document.getElementById('create-checkout-session');    
    createCheckoutSession.addEventListener('submit', handleCheckoutSession);
    //document.getElementById('checkout-and-portal-button').addEventListener('click',handleCheckoutSession)
    const startFreeTrial = document.getElementById('start-free-trial');
    startFreeTrial.addEventListener('submit', handleFreeTrial);
}

async function checkSession() {
    const reply = await fetch(apiUrl+'auth/session',{method: 'GET', headers: {'Content-Type':'Application/json'}, credentials: 'include'})
    return reply.json(); }

function handleFreeTrial(e) {
    e.preventDefault();
    fetch(apiUrl+'auth/session', {method: 'GET', headers: {'Content-Type':'application/json'}, credentials: 'include'})
    .then((reply)=>reply.json())
    .then((response)=>{
        console.log(response);
        if (!response.authenticated) {
            return({error: 'Please log in or sign up first'});
        } else {
            return fetch(apiUrl+'stripe/start-free-trial', {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({userId: response.user.id})});
        }    })
    .then((reply)=>reply.json())
    .then((response)=>{
        if (!response?.ok) {
            const errorLocation = document.getElementById('freeTrialError');
            errorLocation.innerHTML=response.error;
        } else {
            loadPageAndScript('pages/dashboard.html').then(res=>linksEventListeners('span.link'));
        }
    })
    .catch((err)=>console.log('error ',err));
}

export async function handleCheckoutSession(e) {
    e.preventDefault();
    console.log('triggered');
    const formData = new FormData(e.target);
    console.log('fetching ', formData);
    for (const [key, value] of formData.entries()) {
        console.log(`${key} → "${value}"`); 
    };
    const reply = await fetch(apiUrl+'/stripe/create-checkout-session/', {method:'POST', credentials: 'include', body: formData });      
    const response= await reply.json();
    console.log('response ', response)
    if (!response.redirect) {                    
        console.log('error ', response);
    } else {
        console.log('redirect');
        window.location.href=response.redirect;
    }
}
