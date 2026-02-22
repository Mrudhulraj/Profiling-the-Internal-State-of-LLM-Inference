const { colors } = require('@mui/material')

module.exports = {
    mode: 'jit',
    content: [
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            screens: {
                '3xl': '1750px',
            },
            colors: {
                lightBlue: colors.lightBlue,
                blueGray: colors.blueGray,
                trueGray: colors.trueGray,
                warmGray: colors.warmGray,
                indigo: colors.indigo,
                violet: colors.violet,
            },
            transitionProperty: {
                height: 'height',
                width: 'width',
                border: 'border',
                top: 'top',
            },
            scale: {
                120: '1.2',
            },
        },
        fontFamily: {
            montserrat: ['montserrat'],
            poppins: ['poppins'],
            anita: ['anita'],
            archivo: ['Archivo Black'],
            roboto: ['Roboto'],
        },
    },
    plugins: [require('tailwind-scrollbar-hide')],
}
