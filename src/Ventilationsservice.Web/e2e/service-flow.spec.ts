import { expect, test } from "@playwright/test";

test("register a unit and follow a service case", async ({ page }) => {
  const units: Array<Record<string, unknown>> = [];
  const cases: Array<Record<string, unknown>> = [];

  await page.route("**/api/units**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "POST" && url.pathname.endsWith("/service-cases")) {
      const body = request.postDataJSON();
      const serviceCase = {
        id: "case-demo-1",
        ventilationUnitId: url.pathname.split("/")[3],
        title: body.title,
        description: body.description,
        dueDate: body.dueDate,
        status: "Open",
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      cases.push(serviceCase);
      await route.fulfill({ status: 201, json: serviceCase });
      return;
    }

    if (request.method() === "POST") {
      const body = request.postDataJSON();
      const unit = { id: "unit-demo-1", ...body };
      units.push(unit);
      await route.fulfill({ status: 201, json: unit });
      return;
    }

    if (url.pathname.endsWith("/unit-demo-1")) {
      await route.fulfill({ json: { ...units[0], serviceCases: cases } });
      return;
    }

    await route.fulfill({ json: units });
  });

  await page.route("**/api/service-cases**", async (route) => {
    await route.fulfill({ json: cases });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Lägg till aggregat/ }).click();

  await page.locator('input[name="assetNumber"]').fill("E2E-VENT-001");
  await page.locator('input[name="location"]').fill("Testkontor, plan 2");
  await page.locator('input[name="manufacturer"]').fill("Swegon");
  await expect(page.locator('#model-options option[value="GOLD"]')).toHaveCount(1);
  await page.locator('input[name="model"]').fill("GOLD");
  await page.getByRole("button", { name: "Spara aggregat" }).click();

  await expect(page.getByText("E2E-VENT-001")).toBeVisible();
  await expect(page.getByText("Swegon · GOLD")).toBeVisible();

  await page.getByRole("button", { name: /Serviceärenden/ }).click();
  await page.getByRole("button", { name: /Nytt serviceärende/ }).click();
  await page.locator('select[name="ventilationUnitId"]').selectOption("unit-demo-1");
  await page.locator('input[name="title"]').fill("E2E-kontroll av filter");
  await page.locator('input[name="dueDate"]').fill("2099-12-31");
  await page.getByRole("button", { name: "Skapa ärende" }).click();

  await expect(page.getByText("E2E-kontroll av filter")).toBeVisible();
  await expect(page.getByText("E2E-VENT-001 · Testkontor, plan 2")).toBeVisible();
});
