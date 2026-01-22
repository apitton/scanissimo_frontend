import { popup } from '../../script.js';
import { routeNextPage } from './login.js';
//import QRCode from 'qrcode';
export async function init() {
    console.log('missing info');
    initializeFields();
}

async function initializeFields() {
    initializePhone('phone');
    const res = await fetch('/stripe/check-status', {method: 'GET', credentials: 'include'})
    let response = await res.json();
    let missingInfo = response.info;
    console.log('missingInfo ', missingInfo)
    if (missingInfo.email_verified && missingInfo.phone_verified) {        
        if (!missingInfo.onboarding_complete) {
            document.getElementById('missingInfo2').classList.remove('restricted-disable');
        }
    } else {
        document.getElementById('missingInfo1').classList.remove('restricted-disable');
        if (missingInfo.email) {
            document.getElementById('email').value=missingInfo.email;
            document.getElementById('email').dataset.email=missingInfo.email;
            if (missingInfo.email_verified) {
                ['emailCodeRowExplain', 'emailVerifRow', 'emailRow' ].forEach((row)=>document.getElementById(row).classList.add('restricted-disable'))
                document.getElementById('emailVerifRow').classList.add('restricted-disable');
                document.getElementById('emailRow').classList.add('restricted-disable');
            } else {
                document.getElementById('email').readOnly=true;
                document.getElementById('editEmail').addEventListener('click', handleEditEmail);
                document.getElementById('verify_email').addEventListener('click',handleVerifCodeSubmit);
                document.getElementById('resend_email').addEventListener('click', handleResendCode);
            }
            document.getElementById('submitEmail').classList.add('restricted-disable');
            
        } else {
            document.getElementById('submitEmail').addEventListener('click', handleEmailSubmit);
            ['emailCodeRowExplain','emailVerifRow'].forEach((row)=>document.getElementById(row).classList.add('noOpacity'));
        }
        if (missingInfo.phone_nb) {
            document.getElementById('phone').value=missingInfo.phone_nb;
            document.getElementById('phone').dataset.email=missingInfo.phone_nb;
            if (missingInfo.phone_verified) {
                ['phoneCodeRowExplain', 'phoneCodeRow', 'phoneRow' ].forEach((row)=>document.getElementById(row).classList.add('restricted-disable'))            
            } else {            
                document.getElementById('phone').readOnly=true;
                document.getElementById('edit_phone').addEventListener('click', handleEdit_phone);
                document.getElementById('verify_phone').addEventListener('click',handleVerifCodeSubmit);
                document.getElementById('resend_phone').addEventListener('click', handleResendCode);
            }     
        } else {  
            document.getElementById('submit_phone').addEventListener('click', handlePhoneSubmit);
            ['phoneCodeRowExplain','phoneVerifRow'].forEach((row)=>document.getElementById(row).classList.add('noOpacity'));
        }
        document.getElementById('emailCode').addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');}) // remove anything that's not a digit
        document.getElementById('phoneCode').addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');}) // remove anything that's not a digit        
        }
        
        const orgRadios = document.querySelectorAll('input[name="org"]');
        orgRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                console.log('Selected:', event.target.value);
                if (event.target.value=="org") {
                    document.getElementById('org_details').classList.remove('noOpacity');
                } else {
                    document.getElementById('org_details').classList.add('noOpacity');
                }})})
        const accRadios = document.querySelectorAll('input[name="acc"]');
        accRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                console.log('Selected:', event.target.value);
                if (event.target.value=="acc") {
                    document.getElementById('acc_details').classList.remove('noOpacity');
                } else {
                    document.getElementById('acc_details').classList.add('noOpacity');
                }})})
        document.getElementById('t_and_c_popup').addEventListener('click',()=>{
            fetch('./pages/t_and_c.html').then(fetchHref=>(fetchHref.text()))
            .then((result)=>popup(result));
        })
        console.log('adding event listener for missingForm2');
        document.getElementById('missingForm2').addEventListener('submit', handleMissingInfo2);
        const accountantInviteRes = await fetch('auth/checkIfAccountantInvited', { method: 'GET', credentials: 'include', headers: {'Content-Type':'application/json'}});
        const accountantInvite = await accountantInviteRes.json();
        if (accountantInvite.invite) {
            document.getElementById('acceptAccountantInvite').classList.remove('restricted-disable');
            document.getElementById('accountantJoining').classList.add('restricted-disable');
            document.getElementById('acceptAccButton').addEventListener('click',handleAcceptAccountantInvite)
            document.getElementById('refuseAccButton').addEventListener('click',handleRefuseAccountantInvite)
        } else {
            document.getElementById('acceptAccountantInvite').classList.add('restricted-disable');
            document.getElementById('accountantJoining').classList.remove('restricted-disable');
        }
    }

function handleAcceptAccountantInvite() {
    fetch('/auth/acceptAccountantInvited', { method: 'PUT', credentials: 'include', headers: {'Content-Type':'application/json'}})
    .then((res)=>res.json()).then((response)=>{
        if (response.success) {
            popup('Thanks for accepting the invitation!')
            document.getElementById('acceptAccountantInvite').classList.add('restricted-disable');
            document.getElementById('acceptAccButton').removeEventListener('click',handleAcceptAccountantInvite)
            document.getElementById('refuseAccButton').removeEventListener('click',handleRefuseAccountantInvite)
        } else {
            popup('problem processing your request, please try again later')
        } } )
} 

function handleRefuseAccountantInvite() {
    fetch('/auth/refuseAccountantInvited', { method: 'PUT', credentials: 'include', headers: {'Content-Type':'application/json'}})
    .then((res)=>res.json()).then((response)=>{
        if (response.success) {
            popup('Thanks. Your refusal is taken into account.')
            document.getElementById('acceptAccountantInvite').classList.add('restricted-disable');
            document.getElementById('accountantJoining').classList.remove('restricted-disable');
            document.getElementById('acceptAccButton').removeEventListener('click',handleAcceptAccountantInvite)
            document.getElementById('refuseAccButton').removeEventListener('click',handleRefuseAccountantInvite)
        } else {
            popup('problem processing your request, please try again later')
        } } )
}

function handleEmailSubmit() {    
    const emailField = document.getElementById('email');
    const newEmail = emailField.value;    
    if (isValidEmailStrict(newEmail) && emailField.dataset.email!=newEmail) {
        return updateDetails({email: newEmail})
        .then((res)=>{
            console.log(res);            
            popup(res.success?'New email submitted sucessfully':'Problem updating user');
            emailField.dataset.email=newEmail;
            document.getElementById('emailVerifRow').classList.remove('noOpacity', 'restricted-disable');
            document.getElementById('verify_email').removeEventListener('click',handleVerifCodeSubmit)
            document.getElementById('verify_email').addEventListener('click',handleVerifCodeSubmit);
            document.getElementById('resend_email').removeEventListener('click', handleResendCode)
            document.getElementById('resend_email').addEventListener('click', handleResendCode);
            document.getElementById('resend_email').classList.add('missingButtonDisabled')
            setTimeout(()=>document.getElementById('resend_email').classList.remove('missingButtonDisabled'), 60000);
        })
            
        .catch((err)=>console.log('error ', err))        
    } else {
        if (emailField.dataset.email==newEmail) {
            return popup('The email is the same as the one already registered')
        }
        return popup('email invalid');
    }    
}
function handlePhoneSubmit() {

}
function handleEditEmail (e) {
    document.getElementById('email').readOnly=false;    
    ['emailCodeRowExplain','emailVerifRow'].forEach((row)=>document.getElementById(row).classList.add('noOpacity')); 
    e.target.classList.add('restricted-disable');
    document.getElementById('submitEmail').classList.remove('restricted-disable');
    document.getElementById('submitEmail').addEventListener('click',handleEmailSubmit);
}

function handleEdit_phone (e) {
    document.getElementById('phone').readOnly=false;
    document.getElementById('submit_phone').classList.remove('restricted-disable');
    e.target.classList.add('restricted-disable');
}
function updateDetails(newDetails) {
    const body=JSON.stringify(newDetails)
    console.log(body);
    return fetch('db/amendUserDetails',{method: 'PUT', headers: {'Content-Type':'application/json'}, credentials: 'include', body: body})
    .then((res)=>res.json())
    .then((reply)=>{
        console.log('reply from update: ', reply)
        return reply})
    .catch((err)=> {
        console.log('problem updating details ', err)
        return {error: err}})
}

function handleResendCode(e) {
    const type = e.target.id.split('_')[1]
    let body = {type: type}
    console.log(' type ',type);    
    if (type == 'email') {
        body.email=document.getElementById('email').value;}
    if (type == 'phone') {        
        console.log(document.querySelector('.iti__selected-dial-code').value);        
        let phone = document.getElementById('phone').value;
        if (phone.charAt(0)=='0') phone=phone.slice(1);
        body.phone=document.querySelector('.iti__selected-dial-code').innerHTML + phone;
    }
    console.log('body ',body);
    fetch('db/resendVerifCode', {method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify(body)})
    .then((reply)=>reply.json())
    .then((response)=>{
        if (response.success) {
            console.log('success');
            popup(`Code resent to your ${type}!`)
        } else {
            console.log('error');
            popup('error: the code was not sent');
        }
    })
} 

async function handleMissingInfo2(e) {
    //check required fields
    e.preventDefault();
    console.log('prevented');
    let missing={};
    if (Array.from(document.querySelectorAll('input[name="org"]')).every((el)=>!el.checked)) {
        missing.org='Please indicate if you are joining as a single user or as an organisation';
        document.getElementById('orgQuestion').classList.add('text-danger');
    } else {
        document.getElementById('orgQuestion').classList.remove('text-danger');
        if (document.getElementById('organisation').checked && !document.getElementById('org_name').value) {
            console.log('org missing ',document.querySelector('label[for="org_name"]').innerHTML);
            missing.org='Please indicate the name of your organisation';
            document.querySelector('label[for="org_name"]').classList.add('text-danger', 'text-red', 'test');
            console.log(document.querySelector('label[for="org_name"]'));
            console.log(document.querySelector('label[for="org_name"]').classList);
        } else {
            document.querySelector('label[for="org_name"]').classList.remove('text-danger', 'text-red');
            delete missing.org;
        }
    }
    if (Array.from(document.querySelectorAll('input[name="acc"]')).every((el)=>!el.checked)) {
        missing.acc='Please indicate if you are joining as an accountant';
        document.getElementById('accQuestion').classList.add('text-danger');
    } else {
        document.getElementById('accQuestion').classList.remove('text-danger');
        if (document.getElementById('accountant').checked && !document.getElementById('acc_name')) {
            missing.org='Please indicate the name of your firm';
            document.querySelector('label[for="acc_name"]').classList.add('text-danger');
        } else {
            document.querySelector('label[for="acc_name"]').classList.remove('text-danger');
            delete missing.acc;
        }
    }
    if (document.getElementById('organisation') && !document.getElementById('org_name')) {
        missing.orgName='Please indicate the name of the organisation';
        document.querySelector('label[for="org_name').classList.add('text-danger');
    } else {
        document.querySelector('label[for="org_name').classList.remove('text-danger');
        delete missing.orgName;
    }
    if (Array.from(document.querySelectorAll('input[name="mfa"]')).every((el)=>!el.checked)) {
        missing.mfa='Please tell us if you wish to use Multi Factor Authentification';
        document.getElementById('mfaQuestion').classList.add('text-danger');
    } else {
        delete missing.mfa;
        document.getElementById('mfaQuestion').classList.remove('text-danger');
    }
    if (!document.getElementById('required_comm').checked) {
        missing.requiredComm='Please agree to be contacted about subscription, login or receipts';
        document.querySelector('label[for="required_comm"]').classList.add('text-danger');
    } else {
        delete missing.requiredComm;
        document.querySelector('label[for="required_comm"]').classList.remove('text-danger');
    }
    if (!document.getElementById('t_and_c').checked) {
        missing.tAndC='Please agree to our Terms & Conditions';
        document.querySelector('label[for="t_and_c"]').classList.add('text-danger');
    } else {
        delete missing.tAndC;
        document.querySelector('label[for="t_and_c"]').classList.remove('text-danger');
    }
    console.log('missing ', missing)

    if (Object.keys(missing).length>0) {
        popup('Please fill the required fields');
    } else {
        //record preferences into db
        let [update, updateUser] = [{}, null];
        try {
            if (document.getElementById('organisation').checked) {
                const orgId = await fetch('/auth/createOrganisation', {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({org_name: document.getElementById('org_name')})});
                const orgIdResponse = await orgId.json();
                update.organisation_id = orgIdResponse.orgId;
                update.is_manager = true;
                update.is_org_admin = true;
                console.log('orgId ', orgIdResponse)
            }
            if (document.getElementById('accountant').checked) {
                const accId = await fetch('/auth/createAccountant', {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({acc_name: document.getElementById('acc_name')})});
                const accIdResponse = await accId.json();
                console.log('accIdResponse ', accIdResponse);
                update.is_accountant = true;
                update.accId = accIdResponse.accId; // so we can delete it in backtrack if error
                
            }
            if (document.getElementById('offers').checked) update.agree_offers=true;
                update.onboarding_complete=true;
                updateUser = await fetch('/db/amendUserDetails', {method: 'PUT', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(update)});
            if (updateUser.ok) console.log('user updated')
        } catch(err) {
            console.log('error ', err)
            return backtrackForm2(update)
            .then(()=>popup('Sorry, there was an error'));
        }

            //MFA
            if (document.getElementById('mfa').checked && updateUser.ok) {
                document.getElementById('missingInfo2').classList.add('restricted-disable');
                document.getElementById('missingInfo3').classList.remove('restricted-disable');

                try { 
                    const qrCodeReq = await fetch('auth/generateMfa', {method: 'GET', credentials: 'include', headers: {'Content-Type':'application/json'}})                
                    const qrCode = await qrCodeReq.json();
                    console.log('qrCode: ',qrCode);
                    if (qrCodeReq.ok) {
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
                    } else {
                        popup('Sorry, there was a problem generating your authentification code.')
                        routeNextPage();
                              }
                } catch(err) {
                    console.log('error generating qr code ',err)
                    popup('Sorry, there was a problem generating your authentification code.')
                    routeNextPage();
                }
            } else {
                if (updateUser.ok) {
                    routeNextPage();
                } else {
                const update = await updateUser.json();
                return backtrackForm2(update)
                .then(()=>popup('Sorry there was an error :', update.error))}
                
            }
        
    }
}

function backtrackForm2(update) {
    let backtrack={}
    let promiseArray=[];
    if (update.is_accountant) {
        backtrack.is_accountant=false;
        if (update.accId) promiseArray.push(fetch('auth/deleteAccountant', {method: 'DELETE', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({accId: update.accId})}))
    }
    if (update.organisation_id) {
        backtrack.organisation_id = null;
        backtrack.is_org_admin = false;
        backtrack.is_manager = false;
        if (update.orgId) promiseArray.push(fetch('auth/deletOrganisation', {method: 'DELETE', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({org_id: org_id}) }))
    }
    backtrack.onboarding_complete = false;
    backtrack.mfa_enabled = false;
    backtrack.mfa_secret = false;
    backtrack.agree_offers = false;

    promiseArray.push(fetch('db/amendUserDetails', {method: 'PUT', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(backtrack)}))
    
    return Promise.all(promiseArray);
    

}

export function handleMfaSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('verifCode').value;
    fetch('auth/validateMfa', {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({code: code})})
    .then((response)=>{
        if (response.ok) {
            routeNextPage();
        } else {
            document.getElementById('verifCodeMessage').innerHTML='Code invalid';
            document.getElementById('verifCodeMessage').classList.add('text-danger');
            document.getElementById('verifCodeMessage').classList.remove('restricted-disable');
            popup('Code invalid');
        }
    })
}

export function handleVerifCodeSubmit(e) {
    const type=e.target.id.split('_')[1];
    console.log('type ', type,'e.target.id ', e.target.id)
    const code=document.getElementById(`${type}Code`).value;
    fetch('db/checkVerifCode', {method: 'POST', headers: {'Content-Type':'application/json'}, credentials: 'include', body: JSON.stringify({type: type, code: code})})
    .then((reply)=>reply.json())
    .then((response)=>{
        const target = document.getElementById(type);
        if (response.success) {
            popup('Verification successful!');            
            target.innerHTML=`${type} verified!`;
            if (type=='email') {
                ['emailVerifRow','emailCodeRowExplain', 'editEmail'].forEach((row)=>document.getElementById(row).classList.add('restricted-disable'));
                document.getElementById('emailSuccess').classList.remove('restricted-disable');
            }
            if (type=='phone') {
                ['phoneCodeRow','phoneCodeRowExplain', 'edit_phone'].forEach((row)=>document.getElementById(row).classList.add('restricted-disable'));
                document.getElementById('phoneSuccess').classList.remove('restricted-disable');
            }
            fetch('/stripe/check-status', {method: 'GET', credentials: 'include'})
            .then((res)=>res.json()).then((response)=>{
                if (response.info.email_verified && response.info.phone_verified) {
                document.getElementById('missingInfo1').classList.add('restricted-disable');
                document.getElementById('missingInfo2').classList.remove('restricted-disable');}
            })
        } else {
            popup('Verification unsuccessful. The code is either wrong or expired. Please request a new code.');
            target.classList.add('text-danger');
            target.innerHTML=`${type} verification unsuccessful`
        }
    })
    .catch((err)=>{
        console.log('error ', err)
        popup('Verification unsuccessful.')})
}

const strictEmailRe = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

function isValidEmailStrict(email) {
  return strictEmailRe.test(email);
}

export function initializePhone(inputId) {
    let iti;
    const input = document.querySelector(`#${inputId}`);
    if (!input) {
        console.error(`Input with id "${inputId}" not found`);
        return;
    }

    const errorMsg = document.querySelector("#error-msg");
    const validMsg = document.querySelector("#valid-msg");

    // Error mapping for getValidationError()
    const errorMap = [
        "Invalid number",
        "Invalid country code",
        "Too short",
        "Too long",
        "Invalid number" // fallback
    ];

    let phoneNbOk = false; // track validity
    //let iti; // will hold the instance

    // Helper functions
    function reset() {
        errorMsg.classList.add("hide");
        validMsg.classList.add("hide");
        input.classList.remove("error");
    }

    function showError(message) {
        errorMsg.innerHTML = message;
        errorMsg.classList.remove("hide");
        validMsg.classList.add("hide");
        input.classList.add("error");
        phoneNbOk = false;
    }

    function showValid() {
        validMsg.classList.remove("hide");
        errorMsg.classList.add("hide");
        input.classList.remove("error");
        phoneNbOk = true;
    }
    const countryOrder = ["us", "gb", "fr", "at", "be", "ca", "ch", "cz", "de", "dk", "es", "fr", "ie", "it", "pl", "pt", "us",]
    // SINGLE & CORRECT INITIALIZATION
    if (!input.dataset.intlTelInputInitialized) {
        input.dataset.intlTelInputInitialized = "true";

        iti = window.intlTelInput(input, {
            initialCountry: "gb",
            countryOrder: countryOrder,
            nationalMode: false,
            autoPlaceholder: "polite",
            formatOnDisplay: true,
            separateDialCode: true,

            loadUtilsOnInit: "https://cdn.jsdelivr.net/npm/intl-tel-input@24.6.0/build/js/utils.js"
        });
    }

    function validatePhone() {
    if (!iti) return;  // Prevent calling before init

    const number = iti.getNumber();

    if (!iti.getNumber()) {
            showError("Phone number is required");
            return;
        }
        if (iti.isValidNumber()) {
            showValid();
            console.log("Valid number:", iti.getNumber()); // e.g. +447123456789
        } else {
            const errorCode = iti.getValidationError();
            const message = errorCode !== -1 ? errorMap[errorCode] || "Invalid number" : "Invalid number";
            showError(message);
        } } 
    
    // Attach events
    input.addEventListener("keyup", validatePhone);
    input.addEventListener("change", validatePhone); // also validate on country change
    input.addEventListener("blur", validatePhone);

    // Optional: expose for debugging or form submission
    input.iti = iti; // now you can do document.querySelector('#phone').iti.isValidNumber()
    window.iti = iti; // global access if needed

    return { iti, isValid: () => phoneNbOk, getNumber: () => iti.getNumber() };
}