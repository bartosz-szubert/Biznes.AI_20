import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const kpiValue = (page: Page, label: string) =>
  page.locator('.kpi', { hasText: label }).locator('.value');

async function gotoPlanner(page: Page) {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

test('AC1: domyślny preset Zrównoważony daje ROI całkowite 153,5% i zysk 767 500 zł', async ({ page }) => {
  await gotoPlanner(page);
  await expect(kpiValue(page, 'ROI całkowite')).toHaveText('153,5%');
  await expect(kpiValue(page, 'Zysk')).toHaveText(/767\s500\szł/);
  await expect(kpiValue(page, 'Prognozowany przychód')).toHaveText(/1\s267\s500\szł/);
});

test('AC2: suma 95% blokuje zapis; „Wyrównaj do 100%” ją przywraca', async ({ page }) => {
  await gotoPlanner(page);
  await page.getByRole('slider', { name: 'Udział kanału Social media w %' }).fill('50');
  await page.getByLabel('Udział kanału WWW w procentach').fill('30');
  await page.getByLabel('Udział kanału Radio w procentach').fill('15');
  await expect(page.getByRole('status').filter({ hasText: 'Pozostało' })).toBeVisible();

  await page.getByLabel('Nazwa scenariusza (wymagana, maks. 60 znaków)').fill('Test blokady');
  await expect(page.getByRole('button', { name: 'Zapisz jako nowy scenariusz' })).toBeDisabled();

  await page.getByRole('button', { name: 'Wyrównaj do 100%' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Suma: 100%' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zapisz jako nowy scenariusz' })).toBeEnabled();
});

test('AC3: zablokowany Radio nie zmienia się przy wyrównywaniu', async ({ page }) => {
  await gotoPlanner(page);
  await page.getByLabel('Zablokuj kanał Radio').check();
  await page.getByLabel('Udział kanału Social media w procentach').fill('55');
  await page.getByRole('button', { name: 'Wyrównaj do 100%' }).click();
  await expect(page.getByLabel('Udział kanału Radio w procentach')).toHaveValue('20');
  await expect(page.getByLabel('Udział kanału WWW w procentach')).toHaveValue('25');
  await expect(page.getByLabel('Udział kanału Social media w procentach')).toHaveValue('55');
});

test('AC8: ujemne ROI kanału pokazuje ostrzeżenie', async ({ page }) => {
  await gotoPlanner(page);
  await page.getByLabel('ROI kanału Radio w procentach').fill('-20');
  await expect(page.getByText('Radio: ujemne ROI (-20%)')).toBeVisible();
});

test('AC4 + AC6: scenariusz przetrwa odświeżenie; eksport i import JSON odtwarza dane', async ({ page }, testInfo) => {
  await gotoPlanner(page);
  await page.getByLabel('Nazwa scenariusza (wymagana, maks. 60 znaków)').fill('Wariant A');
  await page.getByRole('button', { name: 'Zapisz jako nowy scenariusz' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Zapisano scenariusz' })).toBeVisible();

  await page.reload();
  await page.getByRole('tab', { name: 'Scenariusze' }).click();
  await expect(page.getByText('Wariant A', { exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Eksportuj wszystkie/ }).click();
  const download = await downloadPromise;
  const path = testInfo.outputPath('export.json');
  await download.saveAs(path);

  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole('tab', { name: 'Scenariusze' }).click();
  await expect(page.getByText('Wariant A', { exact: true })).toHaveCount(0);

  await page.locator('input[type="file"]').setInputFiles(path);
  await expect(page.getByText('Wariant A', { exact: true })).toBeVisible();
});

test('AC7: uszkodzony plik importu pokazuje błąd i nie zmienia scenariuszy', async ({ page }, testInfo) => {
  await gotoPlanner(page);
  const bad = testInfo.outputPath('bad.json');
  writeFileSync(bad, '{"app": "budget-roi-planner", "scenarios": [');
  await page.getByRole('tab', { name: 'Scenariusze' }).click();
  await page.locator('input[type="file"]').setInputFiles(bad);
  await expect(page.getByRole('alert').filter({ hasText: 'JSON' })).toBeVisible();
  await expect(page.getByText('Zapisane scenariusze (0)')).toBeVisible();
});

test('AC5: porównanie dwóch scenariuszy pokazuje Δ względem bazowego i wyróżnia najwyższy ROI', async ({ page }) => {
  await gotoPlanner(page);

  // Scenariusz 1: domyślny
  await page.getByLabel('Nazwa scenariusza (wymagana, maks. 60 znaków)').fill('Zrównoważony');
  await page.getByRole('button', { name: 'Zapisz jako nowy scenariusz' }).click();

  // Scenariusz 2: preset E-commerce
  await page.getByLabel('Preset (profil firmy)').selectOption('ecommerce');
  await page.getByLabel('Nazwa scenariusza (wymagana, maks. 60 znaków)').fill('E-commerce');
  await page.getByRole('button', { name: 'Zapisz jako nowy scenariusz' }).click();

  await page.getByRole('tab', { name: 'Scenariusze' }).click();
  await page.getByRole('checkbox', { name: 'Porównaj scenariusz Zrównoważony' }).check();
  await page.getByRole('checkbox', { name: 'Porównaj scenariusz E-commerce' }).check();
  await page.getByRole('button', { name: /Porównaj zaznaczone/ }).click();

  await expect(page.getByRole('heading', { name: 'Porównanie scenariuszy' })).toBeVisible();
  await expect(page.getByText('Najwyższy ROI')).toBeVisible();
  await expect(page.locator('.delta').filter({ hasText: '+71,5 pp' }).first()).toBeVisible();
  await expect(page.getByRole('img', { name: /ROI całkowite:/ })).toBeVisible();
});

test('pierwszy ekran nie ma błędów w konsoli i wykresy się renderują', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await gotoPlanner(page);
  await expect(page.getByRole('img', { name: /Podział budżetu/ })).toBeVisible();
  await expect(page.locator('.chart-svg').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('układ mieści się w szerokości telefonu (360 px) bez przewijania poziomego', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await gotoPlanner(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  // Tabela ma własny przewijany kontener; sprawdzamy, że strona sama nie wychodzi poza ekran.
  expect(overflow).toBeLessThanOrEqual(0);
});
