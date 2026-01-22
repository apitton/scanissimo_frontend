import { popup, manageModalButtons, restoreFooter } from '../../script.js';

export function init() {
    console.log('manage organisation');
    initOrganisation();
}

async function initOrganisation() {
    const fullProfileRes = await fetch('/auth/fullProfile', { method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'} });
    const fullProfile = await fullProfileRes.json();
    if (!fullProfile.is_org_admin) {
        document.getElementById('mainSection').innerHTML='<h1>This page is for admins only</h1>';
        return;
    }
    await fillStaff();
    document.querySelectorAll('.simpleLink[id^="manager"]').forEach((el)=>el.addEventListener('click',handleStatus));
    document.querySelectorAll('.simpleLink[id^="admin"]').forEach((el)=>el.addEventListener('click',handleStatus));
    document.querySelectorAll('button[id^="remove"]').forEach((el)=>el.addEventListener('click',handleRemove));
    document.getElementById('addStaff').addEventListener('submit', handleAddStaff);
    document.querySelectorAll('button[id^="cancelInvite"]').forEach((el)=>el.addEventListener('click',handleRemove))
    document.querySelectorAll('button[id^="resendInvite"]').forEach((el)=>el.addEventListener('click',handleResendInvite))    
    const buttons = ['listViewButton', 'teamsButton', 'manageTeamsButton'];
    const els = ['listView', 'teams', 'manageTeams'];
    const [listView, teams, manageTeams] = els.map((el)=>document.getElementById(el))
    console.log(listView);
    console.log(teams);
    console.log(manageTeams);
    buttons.forEach((button)=>document.getElementById(button).addEventListener('click',(e)=>{
        const type = e.target.id;
        const target = type.split('Button')[0]
        console.log(target);
        ['listView', 'teams', 'manageTeams'].filter((el)=>el!==target).forEach((el)=>document.getElementById(el).classList.add('restricted-disable'));
        document.getElementById(target).classList.remove('restricted-disable');
        }));
}

async function fillStaff() {
    // list section
    document.getElementById('usersBody').innerHTML='';
    const staffRes = await fetch('db/getStaff', { method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'} })
    const staff = await staffRes.json();
    console.log('staff ',staff);
    staff.forEach((el)=>{
        const newRow = document.createElement('tr');
        if (!el.pending) {
            newRow.innerHTML=`
            <td>${el.first_name}</td>
            <td>${el.last_name}</td>
            <td><span class="d-flex align-items-center"><span id="managerInfo-${el.id}">${el.is_manager?'Manager':'No'}</span>&nbsp;<span id="manager-${el.id}" class="material-symbols-outlined simpleLink">change_circle</span></span></td>
            <td><span class="d-flex align-items-center"><span id="adminInfo-${el.id}">${el.is_org_admin?'Admin':'No'}</span>&nbsp;<span class="material-symbols-outlined simpleLink" id="admin-${el.id}">change_circle</span></span></td>            
            <td><button type="button" class="btn btn-outline-primary smallButton" id="remove-${el.id}" data-first_name=${el.first_name} data-last_name=${el.last_name}>Remove</button></td>
            <td> </td>`
        } else {
            newRow.innerHTML=`
            <td>${el.first_name}</td>
            <td>${el.last_name}</td>
            <td><span class="d-flex align-items-center"><span id="managerInfo-${el.id}">${el.is_manager?'Manager':'No'}</span></span></td>
            <td><span class="d-flex align-items-center"><span id="adminInfo-${el.id}">${el.is_org_admin?'Admin':'No'}</span></span></td>            
            <td><button type="button" class="btn btn-outline-primary smallButton" id="cancelInvite-${staff.indexOf(el)}" data-code=${el.code} data-first_name=${el.first_name} data-last_name=${el.last_name}>Cancel</button></td>
            <td><button type="button" class="btn btn-outline-primary smallButton" id="resendInvite-${staff.indexOf(el)}" data-code=${el.code} data-first_name=${el.first_name} data-last_name=${el.last_name}>Resend</button>&nbsp;pending</td>`            
        }        
        document.getElementById('usersBody').appendChild(newRow);        
    })

    //team section
    const teamsRes = await fetch('/db/getTeams', { method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'} });
    const teams = await teamsRes.json();
    console.log('teams ', teams,'array? ',Array.isArray(teams));
    const teamsDisplay = fillTeam(teams, '', true);
    function fillTeam(t, id="", show) {
        console.log('teams from inside ', t);
        console.log('isArray ?', Array.isArray(t));        
        return `<ul ${id?`id="id-${id}"`:''} class="${show?'open':'restricted-disable'}">
                    ${t.map((el)=>`<li class="teamLi noListType ${el.is_manager?'caret':''}" data-id="${el.id}">${el.first_name} ${el.last_name}</li>
                        ${el.is_manager?fillTeam(el.team, el.id, false):''}`).join('')}
                </ul>`;
    }        
    console.log('teamsDisplay ', teamsDisplay);
    document.getElementById('teams').innerHTML=teamsDisplay;
    document.querySelectorAll('.caret').forEach(item => {
        item.addEventListener('click', () => {
            item.classList.toggle('open');
            document.getElementById(`id-${item.dataset.id}`).classList.toggle('restricted-disable');
        });
        });
    //manage team section
    document.getElementById('selectManager').innerHTML="";
    staff.filter((el)=>el.is_manager).forEach((el)=>{
        const newOption = document.createElement('option');
        newOption.value = el.id;
        newOption.innerHTML = `${el.first_name} ${el.last_name}`
        document.getElementById('selectManager').appendChild(newOption);
    })
    document.getElementById('selectManager').addEventListener('change', async (e)=>{
        const [newOption1, newOption2] = [document.createElement('option'), document.createElement('option')];
        document.getElementById('selectNewStaff').appendChild(newOption1);
        document.getElementById('selectExistingStaff').appendChild(newOption2);
        const id=e.target.value;
        if (!id) return;
        console.log('id ', id);
        const teamRes = await fetch('/db/getTeamMembers', { method:'POST', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ id: id })})
        const team = await teamRes.json();
        console.log('staff ', staff);                
        await fillSelectNewStaff(staff, team);        
        fillExistingStaff(team);
    })        
    document.getElementById('removeFromTeam').addEventListener('click', handleRemoveFromTeam);
    document.getElementById('addToTeam').addEventListener('click', handleAddToTeam);
}

async function fillSelectNewStaff(staff, team) {
    document.getElementById('selectNewStaff').innerHTML="";
    const id = document.getElementById('selectManager').value;
    const lineManagersRes = await fetch('/db/getLineManagers', { method:'POST', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ user_id: id })});
    const lineManagers = await lineManagersRes.json();
    console.log('linemanagers ', lineManagers);
    const staffIds = team.map((el)=>el.id);
    staff.filter((el)=>!lineManagers.includes(el.id) && !staffIds.includes(el.id) && el.id!=id && !el.pending).forEach((el)=>{
        const newOption = document.createElement('option');
        newOption.value = el.id;
        newOption.innerHTML = `${el.first_name} ${el.last_name}`
        document.getElementById('selectNewStaff').appendChild(newOption);}) }

function fillExistingStaff(team) {
    document.getElementById('selectExistingStaff').innerHTML="";
    team.forEach((el)=>{
        const newOption = document.createElement('option');
        newOption.value = el.id;
        newOption.innerHTML = `${el.first_name} ${el.last_name}`
        document.getElementById('selectExistingStaff').appendChild(newOption);})
    }

async function handleRemoveFromTeam() {
    const staffId=document.getElementById('selectExistingStaff').value;
    const name = document.getElementById('selectExistingStaff').querySelector('option:checked').innerHTML;
    const managerId=document.getElementById('selectManager').value;
    if (!staffId) return;
    const res = await fetch('/db/removeFromTeam', { method:'DELETE', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ id: staffId, managerId: managerId })})
    const result=await res.json();
    if (!res.ok) {
        popup('Error during removal please try again later.')
        return;
    } else {
        await refreshDropDowns();
        popup(`${name} was successfully removed from the team.`)
    }
    await initOrganisation();
}

async function handleAddToTeam() {
    const staffId=document.getElementById('selectNewStaff').value;
    const name = document.getElementById('selectNewStaff').querySelector('option:checked').innerHTML;
    const managerId=document.getElementById('selectManager').value;
    if (!staffId) return;
    console.log('sending ', { id: staffId, managerId: managerId });
    const res = await fetch('/db/addToTeam', { method:'POST', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ id: staffId, managerId: managerId })})
    const result=await res.json();
    if (!res.ok) {
        popup('Error during removal please try again later.')
        return;
    } else {
        await refreshDropDowns();
        popup(`${name} was successfully added to the team.`)
        await initOrganisation();
    }
}

async function refreshDropDowns() {
    const staffRes = await fetch('db/getStaff', { method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'} })
    const staff = await staffRes.json();
    const teamRes = await fetch('/db/getTeamMembers', { method:'POST', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ id: document.getElementById('selectManager').value })})
    const team = await teamRes.json();
    fillSelectNewStaff(staff, team);        
    fillExistingStaff(team);
}

function handleStatus(e) {
    console.log('change status fired');
    const id = e.target.id.split('-')[1];
    const field = e.target.id.split('-')[0];
    fetch('/auth/changeStatus', { method: 'PUT', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ id: id, field: field }) })
    .then((res)=> res.json()).then((response)=>{
        console.log('response ', response);
        if (response.success) {        
            if (response.status) {            
                document.getElementById(`managerInfo-${id}`).innerHTML=field;
            } else {
                document.getElementById(`managerInfo-${id}`).innerHTML='No';            
            }
        } else {
            popup('Problem during process');
        } })
    .then(()=>initOrganisation())
}

function handleAddStaff(e){
    e.preventDefault();
    const formdata = new FormData(e.target);
    fetch('/auth/addStaff', { method: 'POST', credentials: 'include', body: formdata })
    .then((res)=>res.json()).then((response)=>{
        if (response.success) {
            popup('New member of staff invited!')
            return fillStaff();
        } else {
            popup('problem during process' + response.error)
        }    })
    .then(()=>initOrganisation())
    .catch((err)=>console.log('error ', err))
}

async function handleRemove(e) {
    manageModalButtons(['yesButton', 'noButton'])
    document.getElementById('infoText').innerHTML = `You are about to remove the staff ${e.target.datalink?.first_name} ${e.target.datalink?.last_name}. Are you sure ?`;
    const infoModal = new bootstrap.Modal(document.getElementById('infoModal'));
    infoModal.show();
    document.getElementById('yesButton').addEventListener('click',async () => {
        restoreFooter();
        infoModal.dispose();
        const id = e.target?.id.split('-');
        const code = e.target?.dataset?.code;
        const res = await fetch('/auth/removeStaff', { method: 'PUT', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ id: id, code: code }) })
        const response = res.json();
        if (response.ok) {
            e.target.closest('tr').remove();
        } else {
            popup('Problem during operation');
        }
    })
    document.getElementById('yesButton').addEventListener('click',() => {
        restoreFooter();
        infoModal.dispose();
    });
    await initOrganisation();
}

function handleResendInvite(e) {
    console.log(e.target?.dataset?.code);
    fetch('/auth/resendStaffInvite', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'Application/json' }, body: JSON.stringify({ code: e.target?.dataset?.code })})
    .then((res)=>res.json()).then((response)=>{
        if (response.success) {
            popup('Invitation resent');
        } else {
            popup('Problem during process: ' + response.error);
        }
    })
}


