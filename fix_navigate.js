const fs = require('fs');

let content = fs.readFileSync('app.js', 'utf8');

const regex = /navigate\(view\) \{\s*\/\/ Hide all views\s*document\.querySelectorAll\('\.view-section'\)\.forEach\(el => \{\s*el\.classList\.remove\('active'\);\s*setTimeout\(\(\) => el\.style\.display = 'none', 300\); \/\/ Wait for fade out\s*\}\);/g;

const oldNavigate = `    navigate(view) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.remove('active');
            setTimeout(() => el.style.display = 'none', 300); // Wait for fade out
        });`;

const newNavigate = `    navigate(view) {
        const targetId = view === 'dashboard' ? 'view-dashboard' : 'view-form';

        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => {
            if (el.id !== targetId) {
                el.classList.remove('active');
                setTimeout(() => el.style.display = 'none', 300); // Wait for fade out
            }
        });`;

content = content.replace(regex, newNavigate);
content = content.replace(oldNavigate, newNavigate);

fs.writeFileSync('app.js', content);
