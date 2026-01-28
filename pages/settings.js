import { initializePhone } from "./missingInfo.js";
import { popup, capitalize } from '../script.js'
import { handleCheckoutSession } from "./subscription.js";

export async function init() {
    console.log('settings');
    initializePhone('phone_nb');
    const userDetailsRes = await fetch(apiUrl+'/auth/fullProfile', { method: 'GET', credentials: 'include', headers: { 'Content-Type':'application/json'}});
    const userDetails = await userDetailsRes.json();
    await initForm(userDetails);
    initButtons();
    document.getElementById('phone_nb').addEventListener('change', ()=>console.log('phone ', document.querySelector('.iti__selected-dial-code').innerHTML.slice(1) + document.getElementById('phone_nb').value))    
    document.getElementById('updatePassword').addEventListener('click', handleUpdatePassword);
    document.getElementById('changeMfa').addEventListener('click', handleMfa);
    initiateCategoryMapping(userDetails);
    initiateSubscription(userDetails);

}

async function getFullProfile() {
    return fetch(apiUrl+'/auth/fullProfile', { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' }})
    .then((reply)=>reply.json())
    .catch((err)=>{
        console.log('error ', err);
        return {error: err};})
}

async function initForm(userDetails) {
    document.querySelectorAll('#navLinks li').forEach((el)=>el.addEventListener('click',handleNavigation));    
    if (userDetails.organisation_id && !userDetails.is_org_admin) {
        document.getElementById('categories-sub').classList.add('restricted-disable');
    };
    console.log('navlinks',document.querySelectorAll('#navlinks li:not(.noNav)'));
    await fillUserDetails(userDetails);    
    document.getElementById('editDetails').addEventListener('click', handleEditDetails);    
    document.getElementById('editPhone').addEventListener('click', handleEditPhone);
    document.getElementById('editMail').addEventListener('click', handleEditMail);
}

async function fillUserDetails(userDetails) {    
    console.log('userdetails ', userDetails)
    for (let [key, value] of Object.entries(userDetails)) {
        //console.log('log ',document.getElementById(key));
        console.log('key ', key, 'value ',value)
        //if (document.getElementById(key)) console.log(document.getElementById(key))
        if (key=='phone_nb') {
            document.querySelector('.iti__selected-dial-code').innerHTML='+' + value.slice(0,2);
            document.getElementById('phone_nb').value = value.slice(2);
            console.log('slice ', value.slice(1));
        } else {
            if (document.getElementById(key)) document.getElementById(key).value = value;
        }
        
    }
    if (userDetails.mfa_enabled) {
        document.getElementById('changeMfa').innerHTML = 'Disable MFA';
    } else {
        document.getElementById('changeMfa').innerHTML = 'Enable MFA';
    }
    if (userDetails.organisation_id) {
        document.getElementById('org_row').classList.remove('restricted-disable');
        const orgNameRes = await fetch(apiUrl+'/db/getOrganisation', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ org_id: userDetails.organisation_id})});
        const orgName = await orgNameRes.json();
        document.getElementById('org_name').value = orgName.name || '';
        if (userDetails.is_org_admin) {
            document.getElementById('org_role').value="Admin";
        } else if (userDetails.is_manager) {
            document.getElementById('org_role').value="Manager";
        } else {
            document.getElementById('org_role').value="Employee";
        }
    }
    // now filling categories
    await initiateCategories(userDetails);
    initiateAccountant(userDetails);
    
}

function handleNavigation(e) {
    console.log('clicked ', e.target);
    if (e.target.classList.contains('noNav')) {        
        console.log('here');
        document.getElementById(e.target.dataset.link).classList.toggle('restricted-disable');        
    } else {
        if (!e.target.closest('ul').classList.contains('subMenu')) document.querySelectorAll('.subMenu').forEach((el)=>el.classList.add('restricted-disable'));
        document.getElementById('mainSection').querySelector('.active')?.classList?.remove('active');
        e.target.classList.add('active');
        const targetDiv = e.target.dataset.link;
        document.getElementById('mainSection').querySelector('.activeSection')?.classList?.add('restricted-disable');
        document.getElementById('mainSection').querySelector('.activeSection')?.classList?.remove('activeSection');
        document.getElementById(targetDiv).classList.remove('restricted-disable');
        document.getElementById(targetDiv).classList.add('activeSection');
    }
}

function initButtons() {
    document.getElementById('editDetails').addEventListener('click',handleEditDetails)
}

function handleEditDetails() {    
    console.log('clicked');
    makeFormEditable(['first_name', 'last_name'], ['editDetails', 'submitDetailsForm', 'cancelDetailsForm']);
    ['first_name', 'last_name'].forEach((name)=>{
        const el = document.getElementById(name)
        el.readOnly=false;
        el.classList.remove('input-plain');
        el.classList.add('editable');
    })      
    document.getElementById('submitDetailsForm').addEventListener('click',handleSubmitDetails);
    document.getElementById('cancelDetailsForm').addEventListener('click',async ()=>{
        console.log('clicked');
        document.getElementById('submitDetailsForm').removeEventListener('click', handleSubmitDetails);
        restoreForm(['first_name', 'last_name'], ['editDetails', 'submitDetailsForm', 'cancelDetailsForm']);
        await fillUserDetails();
    });
}

function makeFormEditable(fields, buttons) { //edit, submit, cancel     
    buttons.forEach((el)=> document.getElementById(el).classList.remove('restricted-disable'));
    document.getElementById(buttons[0]).classList.add('restricted-disable');  
    fields.forEach((name)=>{
        const el = document.getElementById(name)
        el.readOnly=false;
        el.classList.remove('input-plain');
        el.classList.add('editable');
    })
}

function restoreForm(fields, buttons) {    //edit, submit, cancel
    buttons.forEach((el)=>document.getElementById(el).classList.add('restricted-disable'));        
    document.getElementById(buttons[0]).classList.remove('restricted-disable')        
    fields.forEach((name)=>{
        const el = document.getElementById(name)
        el.readOnly=true;
        el.classList.add('input-plain');
        el.classList.remove('editable');
    })
}

function handleSubmitDetails() {    
    const body = { first_name: document.getElementById('first_name').value, last_name: document.getElementById('last_name').value }    
    return fetch(apiUrl+'/db/amendUserDetails', {method: 'PUT', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)})
    .then((res)=>{
        if(res.ok) {
           popup('Details updated!') 
           restoreForm(['first_name', 'last_name'], ['submitDetailsForm', 'cancelDetailsForm']);
        } else {
            popup('Problem updating details')
        }
    })
    .catch((err)=>console.log('problem updating details ', err))
}

function handleEditPhone() {
    makeFormEditable(['phone_nb'], ['editPhone', 'submitPhone', 'cancelPhone']);
    document.getElementById('submitPhone').addEventListener('click', handleSubmitPhone)
    document.getElementById('cancelPhone').addEventListener('click', ()=>{
        document.getElementById('submitPhone').removeEventListener('click', handleSubmitPhone);
        restoreForm(['phone_nb'], ['editPhone', 'submitPhone', 'cancelPhone']);
    })
}

function handleSubmitPhone() {
    ['phoneCodeRowExplain','phoneCodeRow'].forEach((el)=>document.getElementById(el).classList.remove('restricted-disable'));
    const body = { phone_nb: document.querySelector('.iti__selected-dial-code').innerHTML.slice(1) + document.getElementById('phone_nb').value }
    return fetch(apiUrl+'/db/amendUserDetails', {method: 'PUT', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)})
    .then((res)=>{
        if(res.ok) {
           popup('Phone number updated! We just sent you a verification code.')
           restoreForm(['phone_nb'], ['editPhone', 'submitPhone', 'cancelPhone']);
           document.getElementById('verify_phone').addEventListener('click', handleVerifCode);
           document.getElementById('resend_phone').addEventListener('click', handleResendCode);
        } else {
            popup('Problem updating details')
        }
    })
}

function handleEditMail() {
    makeFormEditable(['email'], ['editMail', 'submitMail', 'cancelMail']);
    document.getElementById('submitMail').addEventListener('click', handleSubmitMail)
    document.getElementById('cancelMail').addEventListener('click', ()=>{
        document.getElementById('submitMail').removeEventListener('click', handleSubmitMail);
        restoreForm(['email'], ['editMail', 'submitMail', 'cancelMail']);
    })
}

function handleSubmitMail() {
    ['emailCodeRowExplain','emailVerifRow'].forEach((el)=>document.getElementById(el).classList.remove('restricted-disable'));
    const body = { email: document.getElementById('email').value }
    return fetch(apiUrl+'/db/amendUserDetails', {method: 'PUT', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)})
    .then((res)=>{
        if(res.ok) {
           popup('Email updated! We just sent you a verification code.')
           restoreForm(['email'], ['editMail', 'submitMail', 'cancelMail']);
           document.getElementById('verify_email').addEventListener('click', handleVerifCode);
           document.getElementById('resend_email').addEventListener('click', handleResendCode);
        } else {
            popup('Problem updating details')
        }
    })
}

function handleVerifCode(e) {
    const type=e.target.id.split('_')[1];
    console.log('type ', type,'e.target.id ', e.target.id)
    const code=document.getElementById(`${type}Code`).value;
    return fetch(apiUrl+'db/checkVerifCode', {method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({type: type, code: code})})
        .then((reply)=>reply.json())
        .then((response)=>{
            const target = document.getElementById(type);
            if (response.success) {
                popup('Verification successful!');            
                target.innerHTML=`${type} verified!`;
                if (type=='email') {
                    ['emailVerifRow','emailCodeRowExplain', 'editMail'].forEach((row)=>document.getElementById(row).classList.add('restricted-disable'));                    
                }
                if (type=='phone') {
                    ['phoneCodeRow','phoneCodeRowExplain', 'edit_phone'].forEach((row)=>document.getElementById(row).classList.add('restricted-disable'));                    
                }
            } else {
                popup('Verification unsuccessful. The code is either wrong or expired. Please request a new code.');
                target.classList.add('text-danger');                
                    }

            }) }


function handleResendCode(e) {
    const type = e.target.id.split('_')[1]
    let body = {type: type}
    console.log(' type ',type);    
    if (type == 'email') {
        body.email=document.getElementById('email').value;}
    if (type == 'phone') {        
        console.log(document.querySelector('.iti__selected-dial-code').value);        
        let phone = document.getElementById('phone').value.slice(1);
        if (phone.charAt(0)=='0') phone=phone.slice(1);
        body.phone = document.querySelector('.iti__selected-dial-code').innerHTML='+' + value.slice(0,2);
    }
    console.log('body ',body);
    fetch(apiUrl+'db/resendVerifCode', {method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify(body)})
    .then((reply)=>reply.json())
    .then((response)=>{
        if (response.success) {
            console.log('success');
            popup(`Code resent to your ${type}!`)
        } else {
            console.log('error', response.error);
            popup('error: ' + response.error);
        }
    })
} 

function handleUpdatePassword() {
    document.getElementById('newPasswordRow').classList.remove('restricted-disable');
    ['newPassword', 'checkNewPassword'].forEach((el)=> {
        document.getElementById(el).addEventListener('keyup', ()=> checkPasswords ) })
    
    function checkPasswords() {
        const passwdOk = checkPasswd(document.getElementById('newPassword').value, document.getElementById('checkNewPassword').value);
            if (!passwdOk[2]) {
                document.getElementById('newPassword_comment').innerHTML="invalid";
                document.getElementById('newPassword_comment').classList.remove('text-success');
                document.getElementById('newPassword_comment').classList.add('text-danger');
            }  else {
                document.getElementById('newPassword_comment').innerHTML="valid";
                document.getElementById('newPassword_comment').classList.remove('text-danger');
                document.getElementById('newPassword_comment').classList.add('text-success');
            }
            if (!passwdOk[1]) {
                document.getElementById('checkNewPassword_comment').innerHTML="Passwords do not match";
                document.getElementById('checkNewPassword_comment').classList.remove('text-success');
                document.getElementById('checkNewPassword_comment').classList.add('text-danger');
            } else {
                document.getElementById('checkNewPassword_comment').innerHTML="Passwords matching";
                document.getElementById('checkNewPassword_comment').classList.remove('text-danger');
                document.getElementById('checkNewPassword_comment').classList.add('text-success');
            }
            if (!passwdOk[0]) {
                document.getElementById('submitPassword').classList.add('disabled');
            } else {
                document.getElementById('submitPassword').classList.remove('disabled');
            }
    }
    document.getElementById('submitPassword').addEventListener('click', handleSubmitPassword);
    document.getElementById('cancelPassword').addEventListener('click', () => {
        document.getElementById('newPasswordRow').classList.add('restricted-disable');
        ['newPassword', 'checkNewPassword'].forEach((el)=> {
            document.getElementById(el).removeEventListener('keyup', ()=> checkPasswords ) })
        document.getElementById('submitPassword').removeEventListener('click', handleSubmitPassword);
    });
}

function handleSubmitPassword() {    
    return fetch(apiUrl+'auth/changePassword', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json'}, body: new FormData(newPasswordForm) })
    .then((reply)=> reply.json().then((response)=>({ reply, response })))
    .then(({ reply, response })=>{
        if (!reply.ok) {
            popup('Problem: ' + response.error)
        } else {
            popup('New password saved');
            document.getElementById('newPasswordRow').classList.add('restricted-disble');
        }
    })
}

async function handleMfa() {
    const status = document.getElementById('changeMfa').innerHTML;
    if (status=="Disable MFA") {
        //disable, create route
        const reply = await fetch(apiUrl+'auth/disableMfa', { method: 'GET', credentials: 'include', headers: {'Content-Type':'application/json'} });
        const response = await reply.json();
        if (response.success) {
            popup('MFA disable successfully!');
            document.getElementById('changeMfa').innerHTML = 'Enable MFA';
        } else {
            popup('Problem disabling MFA ' + response.error);
        } 
    } else {
        const reply = await fetch(apiUrl+'auth/generateMfa', { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' }})
        const qrCode = await reply.json();
        console.log('qr code', qrCode)
        if (!reply.ok) {
            popup('problem genarating the code ', qrCode.error);
            return;
        }
        document.getElementById('mfaRow').classList.remove('restricted-disable');
        const canvas = document.getElementById('qrCode');
        canvas.src = qrCode.qrCode;
        document.getElementById('authCode').value=qrCode.code.base32;
        document.getElementById('authCodeCopy').addEventListener('click',()=>{
            navigator.clipboard.writeText(qrCode.code.base32);
            popup('Link copied to your clipboard!')
            // remove anything that's not a digit 
        })
        document.getElementById('verifCode').addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length==6) {
                document.getElementById('mfaSubmit').classList.remove('disabled');
            } else {
                document.getElementById('mfaSubmit').classList.add('disabled');
            }
        })
        //display image
        document.getElementById('mfaForm').addEventListener('submit', handleMfaSubmit); 
    }
}

export function handleMfaSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('verifCode').value;
    fetch(apiUrl+'auth/validateMfa', {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({code: code})})
    .then((response)=>{
        if (response.ok) {
            popup('Verification successful')
            document.getElementById('changeMfa'.innerHTML = 'Disable MFA');
            document.getElementById('mfaRow').classList.add('restricted-disable');
        } else {
            document.getElementById('verifCodeMessage').innerHTML='Code invalid';
            document.getElementById('verifCodeMessage').classList.add('text-danger');
            document.getElementById('verifCodeMessage').classList.remove('restricted-disable');
            popup('Code invalid');
        }
    })
}

export function checkPasswd(passwd, confirmPasswd) {    
    const regex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;
    const regexOk = regex.test(passwd);
    return [(regexOk && passwd==confirmPasswd),passwd==confirmPasswd, regexOk]; 
}

async function initiateCategories(userDetails) {
    if (userDetails.organisation_id && !userDetails.is_org_admin) {
        //['cat', 'categories-sub'].forEach((el)=>{document.getElementById(el).classList.add('restricted-disable')})
        document.getElementById('categories').innerHTML = 'This section is reserved to admins.';
        return; }
    document.getElementById('cat').classList.remove('restricted-disable');
    let reply = await fetch(apiUrl+'db/getDefaultCategories', { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' }})
    const defaultCategories = await reply.json();
    console.log('defaultCategories ', defaultCategories)
    const defaultCatList = defaultCategories.map((cat)=>(`
        <li class="noListType d-flex justify-content-between">
           <span>${cat.category}</span><span><strong>${cat.is_fallback?'fallback':''}</strong></span>
        </li>`)).join('');
    document.getElementById('defaultCatList').innerHTML=defaultCatList;
    reply = await  fetch(apiUrl+'db/getCustomCategories', { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' }})
    const customCategories = await reply.json();
    const customCatList = customCategories.map((cat, index)=>(`
        <li class="noListType customCategory d-flex justify-content-between w-100">
            <span>
                <i class="actionLink blue bi bi-trash3" data-category="${cat.category}"></i>&nbsp;
                ${cat.category}
            </span>
            <span><input type="radio" class="${cat.is_fallback?'fallback':''} catRadio" name="fallback" value="${cat.category}" id="cat-${index}" ${cat.is_fallback?'checked':''}></span>
        </li>`)).join('');
    document.getElementById('customCatList').innerHTML=customCatList;
    if (userDetails.uses_custom_categories) {
        document.getElementById('catStatus').innerHTML = 'You are using custom categories';
        document.getElementById('defaultCategories').classList.add('section-faded');
        document.getElementById('catButton').innerHTML = 'Switch to default categories';
        document.getElementById('saveFallback').addEventListener('click',handleChangeFallbackCategory);
        document.getElementById('cancelFallback').addEventListener('click', handleCancelChangeFallback);
        document.querySelectorAll('#customCatList i').forEach((el)=> el.addEventListener('click',handleDeleteCategory));
        document.getElementById('customCatForm').classList.remove('restricted-disable');
        document.getElementById('customCatButtons').classList.remove('restricted-disable');
    } else {
        document.getElementById('catStatus').innerHTML = 'You are using default categories';
        document.getElementById('customCategories').classList.add('section-faded');
        document.getElementById('catButton').innerHTML = 'Switch to custom categories'
    }
    document.getElementById('catButton').addEventListener('click', handleSwitchCategories)
    if (userDetails.uses_custom_categories) {
        document.getElementById('addCategory').addEventListener('click',handleAddCustomCategory);
    }
    
}

function handleSwitchCategories() {
    fetch(apiUrl+'db/switchCatType', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }} )
    .then((reply)=>reply.json()).then((response)=>{
        if (response.success) {
            popup(`Preferences updated. You are now using ${response.newType?'custom':'default'} categories.`);
            if (response.newType) {
                document.getElementById('defaultCategories').classList.add('section-faded');
                document.getElementById('catButton').innerHTML = 'Switch to default categories';
                document.getElementById('defaultCategories').classList.add('section-faded')
                document.getElementById('customCategories').classList.remove('section-faded')
                document.getElementById('customCatForm').classList.remove('restricted-disable');
                document.getElementById('customCatButtons').classList.remove('restricted-disable');
            } else {
                document.getElementById('customCategories').classList.add('section-faded');
                document.getElementById('catButton').innerHTML = 'Switch to custom categories'
                document.getElementById('defaultCategories').classList.remove('section-faded')
                document.getElementById('customCategories').classList.add('section-faded')
                document.getElementById('customCatForm').classList.add('restricted-disable');
                document.getElementById('customCatButtons').classList.add('restricted-disable');
            }
        } else {
            popup('problem updating categories')
        }})
    .catch((err)=>console.log('error ', err))
    
}

function handleAddCustomCategory() {
    const newCat = document.getElementById('newCustomCategory').value;
    const isFallback = document.getElementById('fallback').checked;
    fetch(apiUrl+'db/addCustomCategory', { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({category: newCat, is_fallback: isFallback})})
    .then((reply)=> reply.json()).then((response)=>{
        if (response.success) {
            popup('new category added!');
            if (isFallback) document.querySelector('.fallback').classList.remove('fallback');
            const newLi = document.createElement('li');
            newLi.classList.add('noListType', 'customCategory', 'd-flex', 'justify-content-between', 'w-100');
            newLi.innerHTML=`
                <span>
                    <i class="actionLink blue bi bi-trash3" data-category="${newCat}"></i>&nbsp;
                    ${newCat}
                </span>
                <span><input type="radio" class="${isFallback?'fallback':''} catRadio" name="fallback" value="${newCat}" ${isFallback?'checked':''}></span>`;
            document.getElementById('customCatList').appendChild(newLi);
            newLi.querySelector('i').addEventListener('click',handleDeleteCategory);
        }
    })
}

function handleChangeFallbackCategory() {
    const newFallback = document.querySelector('input[name="fallback"]:checked');
    fetch(apiUrl+'db/makeDefaultCategory', { method: 'PUT', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ category: newFallback.value })})
    .then((reply)=>reply.json()).then((response)=>{
        if (response.success) {
            popup('new fallback category saved')
            document.querySelector('.fallback').classList.remove('fallback');
            newFallback.classList.add('fallback');
        } else {
            popup('Problem updating fallback category ' + response.error)
            document.querySelector('.fallback').checked=true;
        }
    })
}

function handleCancelChangeFallback() {
     document.querySelector('.fallback').checked=true;
}

function handleDeleteCategory(e) {
    const fallback = document.querySelector('input[name="fallback"]:checked').value;
    if (fallback == e.target.dataset.category) {
        popup('You cannot delete the fallback category. Please set another category as fallback before trying again.');
    } else {
        return fetch(apiUrl+'db/deleteCustomCategory', { method: 'DELETE', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ category: e.target.dataset.category })})
        .then((reply)=>reply.json()).then((response)=>{
            if(response.success) {
                popup('Category deleted!');
                e.target.closest('li').remove();
            } else {
                popup('problem deleting the category ' + response.error);
            }
        })
    }
    
}

async function initiateCategoryMapping(userDetails) {
    let reply = await fetch(apiUrl+'db/getClientCategories', { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
    const categories = await reply.json();
    if (userDetails.organisation_id && !userDetails.is_org_admin) {
        document.getElementById('categoriesUsed').innerHTML = 'Section restricted to admins';
        return; }
    
    reply = await fetch(apiUrl+'db/getCustomCategoriesMapping', { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } })
    const mapping = await reply.json();
    console.log('mapping ', mapping);
    document.getElementById('categoriesUsed').innerHTML = categories.categories.map((cat)=>`
        <div class="category">
            <div class="categoryTitle d-flex align-content-center">
                <strong><i class="fa fa-arrow-circle-right categoryArrow"></strong></i>&nbsp;&nbsp;<h5 class="category-title">${cat.category}</h5>
            </div>            
            <div class="categoryBody restricted-disable">
                <ul id="listCatMapping-${cat.category}">
                    <li class="noListType"><input type="text" length = "20" id="addMapping-${cat.category}">&nbsp;<button class="btn btn-outline-primary addMapping" data-category="${cat.category}">Add Supplier</button></li>
                    ${mapping[cat.category]?.map((el)=>`<li class="noListType"><i class="bi bi-trash3 deleteSupplier actionLink blue" data-supplier="${el}"></i>&nbsp;${el}</li>`).join('') || ''}
                </ul>
            </div>            
        </div>
        </div>`).join('');    
    document.querySelectorAll('#categoriesUsed .addMapping').forEach((el)=>{
        el.addEventListener('click', async (e)=>{
            const category = e.target.dataset.category;
            const supplier = document.getElementById(`addMapping-${category}`).value;
            const body = { category: category, supplier: supplier };
            fetch(apiUrl+'db/addCategoryMapping', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then((reply)=>reply.json()).then((response)=>{
                if (response.success) {
                    popup('Supplier added!')
                    const newLi = document.createElement('li');
                    newLi.classList.add('noListType');
                    newLi.innerHTML = `<i class="bi bi-trash3 deleteSupplier actionLink blue" data-supplier="${supplier}"></i>&nbsp;${supplier}`;
                    document.getElementById(`listCatMapping-${category}`).appendChild(newLi);
                    newLi.querySelector('.deleteSupplier').addEventListener('click', handleDeleteSupplier);
                } else {

                }
            })
        })
    })
    document.querySelectorAll('#categoriesUsed i.categoryArrow').forEach((el)=>el.addEventListener('click', (e)=>{
        e.target.classList.toggle('down');
        console.log('div', e.target.closest('div'))
        e.target.closest('div').nextElementSibling.classList.toggle('restricted-disable');
    }))
    console.log('collection ', document.querySelectorAll('#categoriesUsed i.deleteSupplier'))
    document.querySelectorAll('#categoriesUsed i.deleteSupplier').forEach((el)=>{
        el.addEventListener('click', handleDeleteSupplier);
    })
}

function handleDeleteSupplier(e) {
    console.log('clicked');
    return fetch(apiUrl+'db/deleteCategoryMapping', { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplier: e.target.dataset.supplier }) })
    .then((reply)=>reply.json()).then((response)=>{
        if(response.success) {
            popup('Supplier deleted!');
            e.target.closest('li').remove();
        } else {
            popup('Problem deleting supplier ', response.error);
        }
    })
}

function makeCategoryMapLi(category, mapping) {
    return `
        <div class="category">
            <div class="categoryTitle d-flex align-content-center">
                <strong><i class="fa fa-arrow-circle-right categoryArrow"></strong></i>&nbsp;&nbsp;<h5 class="category-title">${category}</h5>
            </div>            
            <div class="categoryBody restricted-disable">
                <ul>
                    <li class="noListType"><input type="text" length = "20" id="addMapping-${category}">&nbsp;<button class="btn btn-outline-primary addMapping" data-category=${category}">Add Supplier</button></li>
                    ${mapping[category]?.map((el)=>`<li class="noListType">${el}</li>`).join('') || ''}
                </ul>
            </div>            
        </div>
        </div>`
}

async function initiateAccountant(userDetails) { 
    let inviteSent=false;   
    if (!userDetails.is_org_admin && userDetails.organisation_id) {
        document.getElementById('accountantInfo').innerHTML=`You are part of ${capitalize(userDetails.org_name)}. ${userDetails.organisation_accountant_first_name?`Their accountant is ${capitalize(userDetails.organisation_accountant_first_name)} ${capitalize(capitalize(userDetails.organisation_accountant_last_name))} ${userDetails.organisation_accountant_name?` from ${capitalize(userDetails.organisation_accountant_name)}`:''}`:' There is currently no accountant for this organisation.'}`;
        return;
    }        
    const accRes = await fetch(apiUrl+'/db/checkAccountantforClient', { method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'} });
    const acc = await accRes.json();    
    if  (userDetails.is_org_admin) {
        if (acc.accountant) {
            document.getElementById('accountantInfo').innerHTML=`You are the admin of ${capitalize(userDetails.org_name)}. Their accountant is ${capitalize(acc.accountant_first_name)} ${capitalize(acc.accountant_last_name)} ${acc.accountant_name?` from ${capitalize(acc.accountant_name)}`:''}`;
            document.getElementById('inviteAccountantButton').classList.add('restricted-disable');
            document.getElementById('revoke').classList.remove('restricted-disable');
        } else {
            document.getElementById('revoke').classList.add('restricted-disable');
            const inviteRes = await fetch(apiUrl+'auth/checkAccountantInvite', { method: 'GET', credentials: 'include', headers: {'Content-Type':'application/json'}})
            const invite = await inviteRes.json();
            if (invite.invite) {
                document.getElementById('accountantInfo').innerHTML=`You invited ${capitalize(invite.acc_first_name)} ${capitalize(invite.acc_last_name)} ${invite.accountant_name?` from ${capitalize(invite.accountant_name)}`:''} to be your organisation's accountant on the ${getDate(invite.invite_date)}.<br>They have not accepted yet.<br><span class="text-decoration-underline">The link will expire 30 days after the invitation date.</span>`
                document.getElementById('cancelInviteAccountantButton').classList.remove('restricted-disable');
                document.getElementById('resendInviteAccountantButton').classList.remove('restricted-disable');
            } else {
                document.getElementById('accountantInfo').innerHTML='Your organisation does not have an accountant yet';
                document.getElementById('inviteAccountantButton').classList.remove('restricted-disable');       
            }        
        }
    }
    if (acc.accountant) {
        // get accountant details
        document.getElementById('accountantInfo').innerHTML=`Your accountant is ${capitalize(acc.accountant_first_name)} ${capitalize(acc.accountant_last_name)} ${acc.accountant_name?` from ${capitalie(acc.accountant_name)}`:''}`;        
        document.getElementById('inviteAccountantButton').classList.add('restricted-disable');
        document.getElementById('revoke').classList.remove('restricted-disable');
    } else {
        //check if an invitation was sent
        document.getElementById('revoke').classList.add('restricted-disable');
        const inviteRes = await fetch(apiUrl+'auth/checkAccountantInvite', { method: 'GET', credentials: 'include', headers: {'Content-Type':'application/json'}})
        const invite = await inviteRes.json();
        if (invite.invite) {
            inviteSent=true;
            document.getElementById('accountantInfo').innerHTML=`You invited ${capitalize(invite.acc_first_name)} ${capitalize(invite.acc_last_name)} ${invite.accountant_name?` from ${capitalize(invite.accountant_name)}`:''} to be your accountant on the ${getDate(invite.invite_date)}.<br>They have not accepted yet.<br><span class="text-decoration-underline">The link will expire 30 days after the invitation date.</span>`
            document.getElementById('cancelInviteAccountantButton').classList.remove('restricted-disable');
            document.getElementById('resendInviteAccountantButton').classList.remove('restricted-disable');
        } else {
            document.getElementById('accountantInfo').innerHTML='You do not have an accountant yet';
            document.getElementById('inviteAccountantButton').classList.remove('restricted-disable');       
        }        
    }
    document.getElementById('client_organisation').value = userDetails.org_name;
    document.getElementById('inviteAccountantButton').addEventListener('click',()=>{
        document.getElementById('inviteAccountant').classList.remove('restrictd-disable');
        })
    document.getElementById('client_organisation').value = userDetails.org_name || '';
    document.getElementById('submitAccountant').addEventListener('click', handleSubmitAccountant);
    document.getElementById('cancelInviteAccountantButton').addEventListener('click', handleCancelInviteAccountant);
    document.getElementById('inviteAccountantButton').addEventListener('click',()=>{
        document.getElementById('inviteAccountant').classList.remove('restricted-disable');
    })
    document.getElementById('resendInviteAccountantButton').addEventListener('click',handleResendInviteAccountant)
    document.getElementById('revoke').addEventListener('click', handleRevokeAccountant);
    const invitesReceivedRes = await fetch(apiUrl+'/db/accountantInvitesReceived', { method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'}});
    const invitesReceived = await invitesReceivedRes.json();
    if (invitesReceived.length) {
        document.getElementById('invitationsReceived').classList.remove('restricted-disable');
        if (userDetails.organisation_accountant?.id || inviteSent) document.getElementById('warningNewAccountant').classList.remove('restricted-disable');
        invitesReceived.forEach((invite)=>{
            const newLi = document.createElement('li');
            newLi.classList.add('d-flex', 'gap-2', 'ml-auto', 'mt-2')
            newLi.innerHTML = `<span>${invite.accountant_first_name} ${invite.accountant_last_name} ${invite.accountant_name?`from ${invite.accountant_name}`:''}</span><span class="d-flex gap-2 ml-auto"><button data-code=${invite.code} class="btn btn-outline-primary smallButton acceptAccInvite">Accept</button>&nbsp;<button data-code=${invite.code} class="btn btn-outline-primary smallButton refuseAccInvite">Refuse</button></span>`;
            document.getElementById('invitesFromAcc').appendChild(newLi);
        })
        document.querySelectorAll('.acceptAccInvite').forEach((button)=>button.addEventListener('click',acceptAccInvite));
        document.querySelectorAll('.refuseAccInvite').forEach((button)=>button.addEventListener('click',refuseAccInvite));
    } else {
        document.getElementById('invitationsReceived').classList.add('restricted-disable');
    }

}
async function acceptAccInvite(e) {
    const res = await fetch(apiUrl+'/db/acceptAccInvite', {method: 'POST', headers: {'Content-Type':'Application/json'}, credentials: 'include', body: JSON.stringify({code: e.target.dataset.code})});
    const response = await res.json();
    if (response.success) {
        const userDetailsRes = await fetch(apiUrl+'/auth/fullProfile', { method: 'GET', credentials: 'include', headers: { 'Content-Type':'application/json'}});
        const userDetails = await userDetailsRes.json();
        await initiateAccountant(userDetails);
        popup('Invitation accepted!')        
    } else {
        popup('Error, please try again later.')       
    }
}

async function refuseAccInvite(e) {
    const res = await fetch(apiUrl+'/db/refuseAccInvite', {method: 'POST', headers: {'Content-Type':'Application/json'}, credentials: 'include', body: JSON.stringify({code: e.target.dataset.code})});
    const response = await res.json();
    if (response.success) {
        const userDetailsRes = await fetch(apiUrl+'/auth/fullProfile', { method: 'GET', credentials: 'include', headers: { 'Content-Type':'application/json'}});
        const userDetails = await userDetailsRes.json();
        await initiateAccountant(userDetails);
        popup('Invitation refused!')        
    } else {
        popup('Error, please try again later.')       
    }
}

function handleSubmitAccountant() {
    const formdata = new FormData(newAccountantForm);    
    fetch(apiUrl+'auth/inviteAccountant', {method: 'POST', credentials: 'include', body: formdata})
    .then((reply)=>reply.json()).then((response)=>{
        if (response.success) {            
            document.getElementById('cancelInviteAccountantButton').classList.remove('restricted-disable'); 
            document.getElementById('resendInviteAccountantButton').classList.remove('restricted-disable'); 
            document.getElementById('inviteAccountant').classList.add('restricted-disable');
            document.getElementById('inviteAccountantButton').classList.add('restricted-disable');
            document.getElementById('accountantInfo').innerHTML=`You invited ${formdata.get('acc_first_name')} ${formdata.get('acc_last_name')} to become your accountant. He has not accepted your invitation yet.`
            popup('Invitation sent!');
        } else {
            popup('Error ', response.error);
        }
    })
}

function handleCancelInviteAccountant() {
    fetch(apiUrl+'auth/cancelInviteAccountant', {method: 'DELETE', credentials: 'include'})
    .then((reply)=>reply.json()).then((response)=>{
        if (response.success) {
            popup('Invitation cancelled!');
            document.getElementById('cancelInviteAccountantButton').classList.add('restricted-disable'); 
            document.getElementById('resendInviteAccountantButton').classList.add('restricted-disable');             
            document.getElementById('inviteAccountantButton').classList.remove('restricted-disable');
            document.getElementById('accountantInfo').innerHTML=`You do not have an accountant yet.`
        } else {
            popup('Error ', response.error);
        }
    })
}

function handleResendInviteAccountant() {
    fetch(apiUrl+'/auth/resendInviteAccountant', { method: 'PUT', credentials: 'include', headers: {'Content-Type':'application/json'}})
    .then((res)=>res.json()).then((response)=>{
        if (response.success) {
            popup('New invitation sent!');
            document.getElementById('resendInviteAccountantButton').classList.add('disabled');
            setTimeout(()=>{
                document.getElementById('resendInviteAccountantButton').classList.remove('disabled');
            }, 60000);
        } else {
            popup('Error: ',response.error);
        }
    })
}

function handleRevokeAccountant() {
    fetch(apiUrl+'auth/revokeAccountant', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}})
    .then((reply)=>reply.json()).then((response)=>{
        console.log('response ',response);
        if (response.success) {
            fetch(apiUrl+'/auth/fullProfile', { method: 'GET', credentials: 'include', headers: { 'Content-Type':'application/json'}})
            .then((res)=>res.json())
            .then((userDetails)=>{
                initiateAccountant(userDetails)
                popup('Accountant revoked!')})            
            .catch((err)=>popup('Error ',err))
        } else {
            popup('Error :',response.error);
        }
    })
}

function initiateSubscription(userDetails) {
    if (userDetails.organisation_id) {
        document.getElementById('subscriptionDetails').innerHTML = `You have access as part of a member of ${userDetails.org_name}. Your subscription is managed by their admin.`;
        return;
    }
    fetch(apiUrl+'/stripe/check-status', {method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'}})
    .then((reply)=>reply.json()).then((response)=>{
        switch (response.status) {
            case 'accountant':
                document.getElementById('subscriptionDetails').innerHTML='You have access as an accountant. If you wish to upload receipts for yourself or your customers, please subscribe.';
                document.getElementById('subscribe').classList.remove('restricted-disable');
                document.getElementById('subscribe').addEventListener('submit', handleCheckoutSession);
                break;
            case 'trial':
                document.getElementById('subscriptionDetails').innerHTML=`You are currently on a free trial ending on the ${getDate(response.endDate, userDetails.date_format)}`;
                document.getElementById('subscribe').classList.remove('restricted-disable');
                break;
            case 'subscribed':
                let subscription_text;
                if (userDetails.organisation_id && !userDetails.is_org_admin) {
                    subscription_text = `You are subscribed as a member of ${userDetails.organisation_name}`;
                } else if (userDetails.is_org_admin) {
                    subscription_text = `You are subscribed as the admin of ${userDetails.organisation_name}.<br>Your plan renews on the ${getDate(response.renewal_date)}.<br>Your organisation currently holds a subscription for  users.<br>This number will vary as you add or remove team members from your organisation.`;
                    document.getElementById('cancelSubscription').classList.remove('restricted-disable');
                } else {
                    document.getElementById('subscriptionDetails').innerHTML=`You are curently on a subscription which renews on the ${getDate(response.renewal_date)}`;
                    document.getElementById('cancelSubscription').classList.remove('restricted-disable');
                break;
        }
    }
} ) }

function getDate(date = new Date(), format="en-gb") {
    const dateToReturn = new Date(date)
    //console.log('date ', dateToReturn, 'format ', format, 'returning ', dateToReturn.toLocaleDateString(format))
    return dateToReturn.toLocaleDateString(format);    
}