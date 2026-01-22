import React, { useState } from 'react';
import { Button } from 'Button.js';
import { Form } from 'form.js';

export default function App() {
    const [clicked, setClicked] = useState(false);

    return (
        <div>
            <span class="d-flex w-100 justify-content-between">
                <h5>Lost your receipt? You can add an entry manually</h5>
                <Button setClicked = {setClicked}/>
            </span>
            {clicked && <Form />}
        </div>
    )
}
