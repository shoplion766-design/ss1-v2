const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Aller à la page de connexion
  await page.goto('https://praktihealthint.com/login', { waitUntil: 'networkidle2' });
  console.log('👉 Connectez-vous maintenant dans la fenêtre qui vient de s\'ouvrir.');

  // Attendre que l'URL change (quand vous serez sur le dashboard)
  await page.waitForFunction(
    () => window.location.href.includes('dashboard') || window.location.href.includes('home'),
    { timeout: 120000 }
  );
  console.log('✅ Connexion réussie ! Sauvegarde en cours...');

  // Sauvegarder le HTML
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('dashboard.html', html);
  console.log('💾 Fichier dashboard.html sauvegardé.');

  // Capture d'écran
  await page.screenshot({ path: 'dashboard.png', fullPage: true });
  console.log('📸 Capture d\'écran dashboard.png sauvegardée.');

  await browser.close();
})();
