import { popup } from '../../script.js';
import { capitalize } from '../../script.js';

export async  function init() {
    console.log('manage customers');
    await initAccountant();

}

async function initAccountant() {
    const existingCustomersRes =  await fetch('db/getAccountantCustomers', { method: 'GET', headers: {'Content-Type':'Application/json'}, credentials: 'include'});
    const existingCustomers = await existingCustomersRes.json();
    if (!existingCustomers.length) {
        document.getElementById('existingCustomers').innerHTML='No customers yet.'    
    } else {
        document.getElementById('existingCustomers').innerHTML=existingCustomers.map((el)=>{
        let name;        
        if (el.type="org") {
            name=el.name;
        } else {
            name = `${el.first_name} ${el.last_name}`
        }
        return `<li class="d-flex w-100 justify-content-between">${name}<button data-type="${el.type}" data-id="${el.id}" type="button" class="btn btn-outline-primary smallButton removeButton">Remove</button></li>`
    }).join('');    
    }    
    const pendingInvitationsFromCustomersRes = await fetch('db/getPendingInvitationsFromCustomers', { method: 'GET', headers: {'Content-Type':'Application/json'}, credentials: 'include'});
    const pendingInvitationsFromCustomers = await pendingInvitationsFromCustomersRes.json();
    if (!pendingInvitationsFromCustomers.length) {
        document.getElementById('invitationsReceived').innerHTML='No pending invitations from customers.'
    } else {
        document.getElementById('invitationsReceived').innerHTML=pendingInvitationsFromCustomers.map((el)=>{
            let name;        
            if (el.type="org") {
                name=el.organisation_name;
            } else {
                name = `${el.first_name} ${el.last_name}`
            }
            return `<li class="d-flex w-100"><span>${name}</span><span class="d-flex gap-2 ml-auto"><button data-code="${el.code}" data-type="${el.type}" data-id="${el.id}" type="button" class="btn btn-outline-primary smallButton acceptButton">Accept</button><button data-type=${el.type}" data-id="${el.id}" type="button" class="btn btn-outline-primary smallButton refuseButton">Refuse</button></span></li>`
        }).join('');
        
    }
    
    
    
    const pendingInvitationsFromAccRes = await fetch('db/getPendingInvitationsFromAccountant', { method: 'GET', headers: {'Content-Type':'Application/json'}, credentials: 'include'});
    const pendingInvitationsFromAcc = await pendingInvitationsFromAccRes.json();
    if (!pendingInvitationsFromAcc.length) {
        document.getElementById('invitationsSent').innerHTML='No invitations pending.'        
    } else {
        document.getElementById('invitationsSent').innerHTML=pendingInvitationsFromAcc.map((el)=>{
        const name = `${capitalize(el.first_name)} ${capitalize(el.last_name)}`;        
        return `<li class="d-flex w-100 mt-2"><span>${name}</span><span class="d-flex gap-2 ml-auto"><button data-code="${el.code}" type="button" class="btn btn-outline-primary smallButton revokeButton">Revoke</button>&nbsp;<button type="button" class="btn btn-outline-primary smallButton resendButton">Resend</button></span></li>`}).join('');
    }
    
    document.querySelectorAll('.acceptButton').forEach((el)=>el.addEventListener('click',acceptInvitation));
    document.querySelectorAll('.refuseButton').forEach((el)=>el.addEventListener('click',refuseInvitation));
    document.querySelectorAll('.revokeButton').forEach((el)=>el.addEventListener('click',revokeInvitation));
    document.querySelectorAll('.removeButton').forEach((el)=>el.addEventListener('click',removeCustomer));
    document.querySelectorAll('.refresh').forEach((el)=>el.addEventListener('click',async()=>initAccountant()))
    document.getElementById('inviteCustomer').addEventListener('submit',sendInvitation);
}

async function sendInvitation(e) {
    e.preventDefault();
    const formdata = new FormData(e.target)
    if (e.target.classList.contains('resend')) {
        formdata.append('resend', true);
        formdata.append('code', e.target.dataset.code);
        formdata.append('invite_first_name', e.target.dataset.first_name)}    
    console.log('target ',e.target.querySelectorAll('input'));
    if (Array.from(e.target.querySelectorAll('input')).some((el)=>!el.value)) return popup('Please fill all the required fields');
    const res = await fetch('/db/sendInvitationFromAccountant', { method: 'POST', credentials: 'include', body: formdata })
    const response = await res.json();
    if (response.success) {
        await initAccountant();    
        return popup('Invitation sent!');
    } 
    popup('Problem sending invitation', response.error);
    await initAccountant();    
}

async function acceptInvitation(e) {
    const res = await fetch('/db/acceptAccountantInvited', { method: 'POST', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ id: e.target.dataset.id, type: e.target.dataset.type })});
    const result = await res.json();
    if(result.success) {
        popup('Invitation accepted!');
        await initAccountant();
    } else {
        popup('Error ' + result.error)
    }
}

async function refuseInvitation(e) {
    const res = await fetch('/db/refuseInvitationFromCustomer', { method: 'POST', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ id: e.target.dataset.id, type: e.target.dataset.type })});
    const result = await res.json();
    if(result.success) {
        popup('Invitation refused!');
        await initAccountant();
    } else {
        popup('Error ' + result.error)
    }
}

async function revokeInvitation(e) {
    const res = await fetch('/db/revokeInvitationFromAccountant', { method: 'PUT', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ code: e.target.dataset.code, type: e.target.dataset.type })});
    const result = await res.json();
    if(result.success) {
        popup('Invitation revoked!');
        await initAccountant();
    } else {
        popup('Error ' + result.error)
    }
}

async function removeCustomer(e) {    
    const res = await fetch('db/removeCustomer', { method: 'PUT', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ type: e.target.dataset.type, id: e.target.dataset.id })})
    const response = await res.json();
    if (response.success) {
        popup('Customer removed!');
        await initAccountant();
    } else {
        popup('Error ' + result.error)
    }
}