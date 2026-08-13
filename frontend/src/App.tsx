import {useState} from 'react';
import logo from './assets/images/logo-universal.png';
import './App.css';
import {AppShell} from '@/components/app-shell';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Greet} from "../wailsjs/go/main/App";

function App() {
    const [resultText, setResultText] = useState("Please enter your name below 👇");
    const [name, setName] = useState('');
    const updateName = (e: any) => setName(e.target.value);
    const updateResultText = (result: string) => setResultText(result);

    function greet() {
        Greet(name).then(updateResultText);
    }

    return (
        <AppShell>
            <div id="App">
                <img src={logo} id="logo" alt="logo"/>
                <div id="result" className="result">{resultText}</div>
                <div id="input" className="input-box">
                    <Input id="name" className="w-auto" onChange={updateName} autoComplete="off" name="input" type="text"/>
                    <Button onClick={greet}>Greet</Button>
                </div>
            </div>
        </AppShell>
    )
}

export default App
