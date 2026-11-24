import { loadFont } from "@remotion/google-fonts/CormorantGaramond";

// Latin only — includes latin-ext for ß, ö, ü in German place names.
const opts = { weights: ["400", "500", "600"] as ("400" | "500" | "600")[], subsets: ["latin", "latin-ext"] as ("latin" | "latin-ext")[] };
loadFont("normal", opts);
loadFont("italic", opts);
