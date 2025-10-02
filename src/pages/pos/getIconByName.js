// src/pages/pos/getIconByName.js
import * as Icons from 'lucide-react';

export default function getIconByName(name){
  return Icons[name] || Icons.Utensils;
}
