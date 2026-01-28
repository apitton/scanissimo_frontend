import { initializePhone } from "./missingInfo.js";
console.log('signup.js');

export function init() {
    
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl, {html: true}));
    const popoverWrapper = document.getElementById('submitWrapper');
    const popover = bootstrap.Popover.getOrCreateInstance(popoverWrapper, {html: true, trigger: 'hover'});
    initializePhone('phone');
    
    document.getElementById("confirmPass").addEventListener("keyup",()=>{
        let passwordChecked=false;
        passwdCheckReset();
        const isPasswdOk = checkPasswd();
        //console.log('ispasswdok', isPasswdOk);
        if (isPasswdOk[0]) {
            document.getElementById('pass-valid-msg').classList.remove('hide');
            passwordChecked=true;
        } else {
            if ((!isPasswdOk[1])) {
                document.getElementById('pass-error-msg').classList.remove('hide');
            }
            if (!isPasswdOk[2]) {
                document.getElementById('passwordExplain').classList.add('text-danger');
            }
        }    
    })
    document.getElementById('email').addEventListener('keyup',()=>{
    console.log('here');
    const val=document.getElementById('email').value;
    const validText = document.getElementById('email-valid-msg');
    const invalidText = document.getElementById('email-error-msg');
    if (!val) {
        validText.classList.add('hide');
        invalidText.classList.add('hide')
    } else {
        console.log('there');        
        const isOk = emailCheck();        
        if(isOk) {
            console.log('is ok');
            validText.classList.remove('hide');
            invalidText.classList.add('hide');
        } else {
            console.log('is not ok');
            invalidText.classList.remove('hide');
        }
    } })
    const allInputs = document.querySelectorAll('input');
    allInputs.forEach((input)=>{
        input.addEventListener('keyup',()=>{
            checkForm();
        })
    })
    document.querySelectorAll('input[name="acc_type"]').forEach((el)=>el.addEventListener('click',checkForm))
    function checkForm() {
        const allFields = checkRequiredFields();
            const passwdOk=checkPasswd();
            const emailOk=emailCheck();
            const submit = document.getElementById('submitButton');        
            const phoneNbOk = document.getElementById('valid-msg').innerHTML=='✓ Valid';
            console.log('allFields ', allFields, 'passwdOk ', passwdOk[0], 'phoneNbOk ',phoneNbOk, 'email ',emailOk);
            popover.hide();
            if (allFields && passwdOk[0] && phoneNbOk && emailOk) {
                submit.disabled=false;
                popover.disable();
            } else {
                submit.disabled=true;                
                const completeAllFields = '<li>Please fill al the required fields</li>';
                const passwordsNotMatch = '<li>Passwords do not match</li>';
                const phoneNbNotOk = '<li>Please check the phone number</li>';
                const emailNotOk = '<li>Please check the email</li>';
                const popoverContent =  `<ul>${allFields?'':completeAllFields}${passwdOk[0]?'':passwordsNotMatch} 
                                        ${phoneNbOk?'':phoneNbNotOk}${emailOk?'':emailNotOk}</ul>`;
                console.log('changing popover ', popoverContent);    
                popover.enable();            
                popover.setContent ({'.popover-header': 'Please check your input', '.popover-body': popoverContent});
            }
    }
    const signupForm=document.getElementById('signupForm');
    document.querySelectorAll('input[name="acc_type"]').forEach((el)=>el.addEventListener('change',(e)=>{        
        if (e.target.value == 'org') {
            document.getElementById('org_name').classList.remove('restricted-disable');
        } else {
            document.getElementById('org_name').classList.add('restricted-disable');
        }
    }))
    signupForm.addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
    e.preventDefault();
    if (!checkRequiredFields()) {
        popup('Please fill all required fields');
        return;
    }
    const errorMsg=document.getElementById('errorMsg');
    errorMsg.innerHTML='';
    console.log('form submitted');        
    for (const el of ['firstName', 'lastName']) {
        console.log(el);
        const t = document.getElementById(el).value;
        document.getElementById(el).value = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    }
    const formdata = new FormData(signupForm);        
    console.log('formdata', formdata);
    for (const [key, value] of formdata.entries()) {
        console.log(`${key} → "${value}"`); };
    const reply = await fetch(apiUrl+'/auth/register',{method: 'POST', body: formdata});
    const response = await reply.json();
    console.log(response);
    if (response.ok) {
        console.log('response ok');
        // redirect to subscription page
        const submitButton=document.getElementById('submitButton');
        console.log(submitButton.dataset.link);
        loadPageAndScript(submitButton.dataset.link)
        .then(()=>linksEventListeners('span.link'));
    } else {        
        errorMsg.innerHTML=response.error;     
        popup('Error ' + response.error);   
    }
    console.log(response);
}

export function checkPasswd() {
    const passwd = document.getElementById('pass').value;
    const confirmPasswd = document.getElementById('confirmPass').value;
    const regex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;
    const regexOk = regex.test(passwd);
    return [(regexOk && passwd==confirmPasswd),passwd==confirmPasswd, regexOk]; 
}

export function passwdCheckReset() {
    document.getElementById('pass-valid-msg').classList.add('hide');
    document.getElementById('pass-error-msg').classList.add('hide');
    document.getElementById('passwordExplain').classList.remove('text-danger');   
}
function emailCheck() {
    const value=document.getElementById('email').value;
    const regex= /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
    return regex.test(value);
}
function checkRequiredFields() {
    let requiredFields = Array.from(document.querySelectorAll('.required'));   
    console.log('requiredfields ', requiredFields)     
    console.log('org type ', document.querySelector('input[name="acc_type"]:checked')?.value);
    if (document.querySelector('input[name="acc_type"]:checked')?.value=="ind") {
        console.log('ind ', requiredFields.length);
        requiredFields = requiredFields.filter((el)=>el.htmlFor!='orgName');}
    console.log('required ', requiredFields, requiredFields.length);
    let check=true;
    requiredFields.forEach((field) => {
        const inputId = field.htmlFor;
        console.log('field ', field, 'input name ', inputId);
        const inputField=document.querySelector(`input[name="${inputId}"]`);
        //const inputField=document.getElementById(inputId);
        console.log('inputField ', inputField)
        //console.log('inputfield ',inputField, 'inputId ',inputId);
        if (!inputField.value) {
            //console.log('field: ', inputField);
            check=false;
        }
    })
    return check;
}
