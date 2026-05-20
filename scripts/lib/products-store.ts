import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {ProductsData, RetailersData} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PRODUCTS_PATH = resolve(__dirname, '../../src/data/products.json');
export const RETAILERS_PATH = resolve(__dirname, '../../src/data/retailers.json');

export function readProducts(): ProductsData {
  return JSON.parse(readFileSync(PRODUCTS_PATH, 'utf-8'));
}

export function writeProducts(data: ProductsData): void {
  writeFileSync(PRODUCTS_PATH, JSON.stringify(data, null, 2) + '\n');
}

export function readRetailers(): RetailersData {
  try {
    return JSON.parse(readFileSync(RETAILERS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeRetailers(data: RetailersData): void {
  writeFileSync(RETAILERS_PATH, JSON.stringify(data, null, 2) + '\n');
}
