// Ambient module declaration so TypeScript accepts plain `import "./x.css"`
// side-effect imports (used by sidepanel/main.tsx) without a CSS type plugin.
declare module "*.css"
