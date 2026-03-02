'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle = ({ className = '' }) => {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    useEffect(() => {
        if (dark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [dark]);

    return (
        <button onClick={() => setDark(!dark)}
            className={`p-2 rounded-lg transition-colors ${dark ? 'text-accent hover:bg-accent/10' : 'text-gray-medium hover:bg-gray-100'} ${className}`}
            title={dark ? 'Modo claro' : 'Modo oscuro'}>
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
};
