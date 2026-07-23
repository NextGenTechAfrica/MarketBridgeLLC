import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const dir = 'c:\\Users\\Benny Ben\\Documents\\MarketBridgeLLC\\app\\(main)\\seller';

walkDir(dir, (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        // Replace string literal paths
        content = content.replace(/(['"`])\/(orders|chats|settings|pricing)(.*?)\1/g, (match, quote, route, rest) => {
            if (rest.startsWith(')')) return match; 
            if (route === 'pricing') route = 'subscription'; // Let's map pricing to subscription for the seller side as it makes more sense, or just keep pricing? Let's just use /seller/pricing to be simple since I copied the folder as /seller/subscription. Wait! I copied pricing to subscription. I should map pricing to subscription.
            
            let finalRoute = route;
            if (route === 'pricing') finalRoute = 'subscription';

            return `${quote}/seller/${finalRoute}${rest}${quote}`;
        });
        
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${filePath}`);
        }
    }
});
