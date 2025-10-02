// src/pages/pos/components/CategoryTabs.jsx
import { Grid2X2, Star } from 'lucide-react';
import TabBtn from '../TabBtn.jsx';
import getIconByName from '../getIconByName.js';
import { TAB_ALL, TAB_TOP } from '../constants.js';

export default function CategoryTabs({ categories, activeTab, setActiveTab }){
  return (
    <div className="flex flex-wrap gap-2 pb-2">
      <TabBtn active={activeTab===TAB_ALL} onClick={()=>setActiveTab(TAB_ALL)} icon={<Grid2X2 size={16}/>}>Sve</TabBtn>
      <TabBtn active={activeTab===TAB_TOP} onClick={()=>setActiveTab(TAB_TOP)} icon={<Star size={16}/>}>Najčešće</TabBtn>
      {categories.map(c=>{
        const Icon = getIconByName(c.icon);
        return (
          <TabBtn key={c.id} active={activeTab===c.id} onClick={()=>setActiveTab(c.id)} icon={<Icon size={16}/>}>
            {c.name}
          </TabBtn>
        );
      })}
    </div>
  );
}
