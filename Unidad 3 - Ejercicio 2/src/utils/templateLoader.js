export default async function loadTemplate(fileName, baseUrl) {
  const url = new URL(`templates/${fileName}?v=${Date.now()}`, baseUrl);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar la plantilla: ${fileName}`);
  return res.text();
}