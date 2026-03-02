/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#EB1C24",
                secondary: "#0093D8",
                success: "#A4CC39",
                accent: "#FFC905",
                gray: {
                    light: '#F5F5F7',
                    medium: '#8E8E93',
                    dark: '#1D1D1F',
                }
            },
            boxShadow: {
                'brand': '0 4px 14px 0 rgba(235, 28, 36, 0.15)',
                'brand-lg': '0 10px 25px -3px rgba(235, 28, 36, 0.2)',
            }
        },
    },
    plugins: [],
};
