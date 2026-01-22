import { useState } from 'react';

export default function Button(props) {    
    const [text, setText] = useState('Click to open Form');
    function handleClick() {
        props.setClicked((prev)=>!prev);
        setText((prev)=>prev=='Click to open Form'?'Click to hide form':'Click to open Form')        
    }
    return React.createElement('button', { onClick: {handleClick}, id: "toggleForm" });
}