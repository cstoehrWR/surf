import de from "@/messages/de.json";
import en from "@/messages/en.json";

const dictionaries = { de, en };
export type Locale = keyof typeof dictionaries;

export function getDictionary(locale: Locale = "de") {
  return dictionaries[locale] ?? dictionaries.de;
}
