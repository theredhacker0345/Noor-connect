import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { 
  Sparkles, 
  Moon, 
  Star, 
  CheckCircle2, 
  RotateCcw,
  Calendar,
  Clock,
  Heart,
  Shirt,
  ShoppingBag,
  Users,
  Utensils,
  PartyPopper,
  Zap,
  Coffee,
  Sun,
  Droplets,
  Coins,
  Trash2,
  Plus,
  X,
  ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  category: 'sunnah' | 'mandatory' | 'prep';
  icon: any;
  eidSpecific?: 'fitr' | 'adha' | 'both';
  isCustom?: boolean;
}

interface EidChecklistData {
  fitr: ChecklistItem[];
  adha: ChecklistItem[];
}

const defaultChecklistItems: Omit<ChecklistItem, 'checked'>[] = [
  // ─── Mandatory Actions ─────────────────────────────────────────
  { id: 'fitrana', text: 'Pay Zakat al-Fitr (before Eid prayer)', category: 'mandatory', icon: Coins, eidSpecific: 'fitr' },
  { id: 'eid-prayer', text: 'Attend the Eid prayer congregation', category: 'mandatory', icon: Users, eidSpecific: 'both' },
  { id: 'qurbani', text: 'Arrange Qurbani / Udhiyah sacrifice', category: 'mandatory', icon: Heart, eidSpecific: 'adha' },

  // ─── Sunnah Acts ───────────────────────────────────────────────
  { id: 'ghusl', text: 'Perform Ghusl (ritual bath)', category: 'sunnah', icon: Droplets, eidSpecific: 'both' },
  { id: 'dates', text: 'Eat an odd number of dates before Eid prayer', category: 'sunnah', icon: Coffee, eidSpecific: 'fitr' },
  { id: 'no-eat-adha', text: 'Do not eat before Eid prayer (Sunnah for Adha)', category: 'sunnah', icon: Coffee, eidSpecific: 'adha' },
  { id: 'best-clothes', text: 'Wear your best available clothes', category: 'sunnah', icon: Shirt, eidSpecific: 'both' },
  { id: 'ittar', text: 'Apply ittar / perfume (men)', category: 'sunnah', icon: Sparkles, eidSpecific: 'both' },
  { id: 'takbirat', text: 'Recite Takbirat loudly on the way to prayer', category: 'sunnah', icon: Zap, eidSpecific: 'both' },
  { id: 'walk-prayer', text: 'Walk to the Eid prayer ground (if possible)', category: 'sunnah', icon: Sun, eidSpecific: 'both' },
  { id: 'different-way', text: 'Return home using a different path', category: 'sunnah', icon: Sun, eidSpecific: 'both' },
  { id: 'adha-meat', text: 'Eat from your Qurbani meat first', category: 'sunnah', icon: Utensils, eidSpecific: 'adha' },
  { id: 'distribute-meat', text: 'Distribute Qurbani meat (⅓ poor, ⅓ relatives, ⅓ self)', category: 'sunnah', icon: ShoppingBag, eidSpecific: 'adha' },

  // ─── Preparation & Good Deeds ─────────────────────────────────
  { id: 'greet-family', text: 'Greet everyone with "Eid Mubarak!"', category: 'prep', icon: Heart, eidSpecific: 'both' },
  { id: 'charity', text: 'Give additional Sadaqa to those in need', category: 'prep', icon: ShoppingBag, eidSpecific: 'both' },
  { id: 'visit-relatives', text: 'Visit relatives and strengthen family ties', category: 'prep', icon: Users, eidSpecific: 'both' },
  { id: 'forgive', text: 'Forgive others & seek forgiveness', category: 'prep', icon: Heart, eidSpecific: 'both' },
  { id: 'dua', text: 'Make special Dua on this blessed day', category: 'prep', icon: Star, eidSpecific: 'both' },
];

export default function EidChecklist() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isEidAlFitr, isEidAlAdha, islamicInfo, isLoading } = useIslamicCalendar();

  // Determine current Eid type
  const currentEidType = useMemo(() => {
    if (!islamicInfo) return null;
    
    const hijriMonth = islamicInfo.hijriMonth;
    const hijriDay = islamicInfo.hijriDay;
    
    if (isEidAlFitr) return 'fitr';
    if (isEidAlAdha) return 'adha';
    if (hijriMonth === 9 && (hijriDay === 29 || hijriDay === 30)) return 'fitr'; // Last night of Ramadan
    if (hijriMonth === 12 && (hijriDay === 8 || hijriDay === 9)) return 'adha'; // Dhul Hijjah 8–9 / Arafah — prep day before Eid al-Adha
    return null;
  }, [isEidAlFitr, isEidAlAdha, islamicInfo]);

  // Load checklist data from localStorage
  const loadChecklistData = (): EidChecklistData => {
    try {
      const stored = localStorage.getItem('eid-checklist-data');
      if (stored) {
        const parsed = JSON.parse(stored);
        
        const mergeData = (type: 'fitr' | 'adha') => {
          const storedItems = parsed[type] || [];
          
          // 1. Start with all current default items
          const defaults = defaultChecklistItems
            .filter(d => d.eidSpecific === 'both' || d.eidSpecific === type)
            .map(d => {
              const stored = storedItems.find((s: any) => s.id === d.id);
              return { ...d, checked: stored ? stored.checked : false };
            });
          
          // 2. Add custom items that aren't in defaults
          const customs = storedItems.filter((s: any) => s.isCustom);
          
          return [...defaults, ...customs];
        };

        return {
          fitr: mergeData('fitr'),
          adha: mergeData('adha')
        };
      }
    } catch (error) {
      console.error('Error loading checklist data:', error);
    }
    
    // Return default data if nothing stored
    return {
      fitr: defaultChecklistItems.map(item => ({ ...item, checked: false })),
      adha: defaultChecklistItems.map(item => ({ ...item, checked: false }))
    };
  };

  const [checklistData, setChecklistData] = useState<EidChecklistData>(loadChecklistData);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<'sunnah' | 'mandatory' | 'prep'>('prep');

  // Logic to add a task
  const addTask = () => {
    if (!currentEidType || !newTaskText.trim()) return;

    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      text: newTaskText,
      checked: false,
      category: newTaskCategory,
      icon: ClipboardList,
      isCustom: true,
      eidSpecific: 'both'
    };

    const updatedData = {
      ...checklistData,
      [currentEidType]: [...checklistData[currentEidType], newItem]
    };

    setChecklistData(updatedData);
    saveChecklistData(updatedData);
    setNewTaskText("");
    setIsAddDialogOpen(false);
    
    toast({
      title: "Task Added",
      description: "Your custom Eid task has been created.",
    });
  };

  // Logic to delete a task
  const deleteTask = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!currentEidType) return;

    const updatedData = {
      ...checklistData,
      [currentEidType]: checklistData[currentEidType].filter(item => item.id !== itemId)
    };

    setChecklistData(updatedData);
    saveChecklistData(updatedData);
    
    toast({
      title: "Task Removed",
      description: "The task has been removed from your list.",
    });
  };

  // Get current checklist based on Eid type
  const currentChecklist = useMemo(() => {
    if (!currentEidType) return [];
    return checklistData[currentEidType];
  }, [currentEidType, checklistData]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (currentChecklist.length === 0) return 0;
    const checkedCount = currentChecklist.filter(item => item.checked).length;
    return Math.round((checkedCount / currentChecklist.length) * 100);
  }, [currentChecklist]);

  // Save checklist data to localStorage
  const saveChecklistData = (data: EidChecklistData) => {
    try {
      localStorage.setItem('eid-checklist-data', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving checklist data:', error);
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    if (!currentEidType) return;
    
    const updatedData = { ...checklistData };
    const itemIndex = updatedData[currentEidType].findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      updatedData[currentEidType][itemIndex].checked = checked;
      setChecklistData(updatedData);
      saveChecklistData(updatedData);
      
      // Calculate completion count for immediate celebration
      const updatedList = updatedData[currentEidType].filter(item => 
        item.eidSpecific === 'both' || item.eidSpecific === currentEidType
      );
      const checkedCount = updatedList.filter(item => item.checked).length;
      const totalItems = updatedList.length;
      const pct = Math.round((checkedCount / totalItems) * 100);
      
      // Haptic feedback if available
      if (checked && 'vibrate' in navigator) navigator.vibrate(10);

      // Milestone celebrations
      if (checked && pct === 25) {
        toast({ title: "🌟 Great start!", description: "25% complete — keep going, you're building momentum!" });
      } else if (checked && pct === 50) {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 }, colors: ['#e0c097', '#d4af37'] });
        toast({ title: "✨ Halfway there!", description: "50% done — you're doing amazing, MashaAllah!" });
      } else if (checked && pct === 75) {
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.65 }, colors: ['#e0c097', '#d4af37', '#b38b5d'] });
        toast({ title: "🎊 Almost done!", description: "75% complete — the finish line is near!" });
      } else if (checked && checkedCount === totalItems) {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#e0c097', '#d4af37', '#b38b5d', '#0a1128']
        });
        toast({
          title: "🎉 Eid Mubarak!",
          description: "You've completed all Eid preparations! Taqabbal Allahu minna wa minkum.",
        });
      }
    }
  };

  // Reset current checklist
  const resetChecklist = () => {
    if (!currentEidType) return;
    
    // Completely restore defaults
    const updatedData = { ...checklistData };
    updatedData[currentEidType] = defaultChecklistItems
      .filter(item => item.eidSpecific === 'both' || item.eidSpecific === currentEidType)
      .map(item => ({ ...item, checked: false }));
      
    setChecklistData(updatedData);
    saveChecklistData(updatedData);

    toast({
      title: "Restored Defaults",
      description: "Custom tasks removed and official tasks reset.",
    });
  };

  // Auto-reset when new Eid period begins
  useEffect(() => {
    if (currentEidType) {
      const today = new Date().toDateString();
      const lastResetKey = `eid-checklist-last-reset-${currentEidType}`;
      const lastReset = localStorage.getItem(lastResetKey);
      
      if (lastReset !== today) {
        // Check if this is the first day of Eid
        const isFirstDay = (currentEidType === 'fitr' && isEidAlFitr) || 
                         (currentEidType === 'adha' && isEidAlAdha);
        
        if (isFirstDay) {
          const updatedData = { ...checklistData };
          updatedData[currentEidType] = updatedData[currentEidType].map(item => ({ ...item, checked: false }));
          setChecklistData(updatedData);
          saveChecklistData(updatedData);
          localStorage.setItem(lastResetKey, today);
        }
      }
    }
  }, [currentEidType, isEidAlFitr, isEidAlAdha, checklistData]);

  // Get Eid title and greeting
  const getEidInfo = () => {
    if (!islamicInfo) return null;
    
    const hijriMonth = islamicInfo.hijriMonth;
    const hijriDay = islamicInfo.hijriDay;
    
    if (currentEidType === 'fitr') {
      return {
        title: 'Eid al-Fitr',
        greeting: 'Eid al-Fitr Mubarak',
        subtitle: 'Festival of Breaking the Fast'
      };
    } else if (currentEidType === 'adha') {
      return {
        title: 'Eid al-Adha',
        greeting: 'Eid al-Adha Mubarak',
        subtitle: 'Festival of Sacrifice'
      };
    } else if (hijriMonth === 9 && (hijriDay === 29 || hijriDay === 30)) {
      return {
        title: 'Prepare for Eid',
        greeting: 'Eid Preparation',
        subtitle: 'Get ready for Eid al-Fitr'
      };
    }
    return null;
  };

  const eidInfo = getEidInfo();

  // If not in Eid period or preparation night, show message
  if (!currentEidType && !isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
          <AppBar title={t("eidChecklist") || "Eid Checklist"} showBack={true} />
          
          <div className="flex-1 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm relative overflow-hidden rounded-[40px] p-8 text-center bg-white shadow-xl border border-slate-100"
            >
              <div className="relative z-10 space-y-6">
                <div className="inline-flex p-5 bg-amber-50 rounded-3xl border border-amber-100">
                  <Calendar className="w-10 h-10 text-amber-600" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900">Soon, InshaAllah!</h2>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    The Eid checklist becomes available on the last day of Ramadan and during the days of Eid.
                  </p>
                </div>

                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/services')}
                    className="w-full h-12 rounded-2xl border-slate-200 hover:bg-slate-50 text-amber-600"
                  >
                    Explore other services
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading || !eidInfo) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-[#f8f9fa] pb-32">
          <AppBar title={t("eidChecklist") || "Eid Checklist"} showBack={true} />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        </div>
      </PageTransition>
    );
  }

  const categories = [
    { id: 'mandatory', label: 'Mandatory', icon: CheckCircle2, color: 'text-rose-600 bg-rose-50' },
    { id: 'sunnah', label: 'Sunnah', icon: Sparkles, color: 'text-amber-600 bg-amber-50' },
    { id: 'prep', label: 'Preparation', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#f8f9fa] pb-32">
        <AppBar title={t("eidChecklist") || "Eid Checklist"} showBack={true} />

        <div className="max-w-xl mx-auto p-4 space-y-8 mt-2">
          {/* Eid Header Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[40px] shadow-lg p-8 group bg-white border border-slate-100"
          >
            {/* Soft decorative elements for light theme */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-[20px] opacity-60"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-[20px] opacity-40"></div>

            {/* Content */}
            <div className="relative z-10 text-center space-y-4">
              <div className="flex justify-center mb-2">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <Moon className="w-8 h-8 text-amber-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {eidInfo.greeting}
              </h1>
              <p className="text-slate-500 text-lg">
                {eidInfo.subtitle}
              </p>

              <div className="flex flex-col items-center pt-2 gap-6">
                {/* Minimal Progress Ring */}
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-slate-100"
                    />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray="364.4"
                      initial={{ strokeDashoffset: 364.4 }}
                      animate={{ strokeDashoffset: 364.4 - (364.4 * completionPercentage) / 100 }}
                      className="text-amber-600"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900">{completionPercentage}%</span>
                    <span className="text-xs uppercase tracking-widest font-bold text-slate-400">Complete</span>
                  </div>
                </div>

                {/* Add Task Trigger */}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-8 py-6 shadow-lg shadow-slate-200 transition-all active:scale-95"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Personal Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-slate-100 text-slate-900 rounded-[32px] sm:max-w-md shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold">New Preparation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="task-text" className="text-slate-500">What needs to be done?</Label>
                        <Input 
                          id="task-text"
                          placeholder="e.g. Call relatives, Buy sweets..."
                          value={newTaskText}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          className="bg-slate-50 border-slate-200 rounded-xl focus:ring-amber-500 h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-500">Category</Label>
                        <Select 
                          value={newTaskCategory} 
                          onValueChange={(v: any) => setNewTaskCategory(v)}
                        >
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-12">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-100">
                            <SelectItem value="mandatory">Mandatory</SelectItem>
                            <SelectItem value="sunnah">Sunnah</SelectItem>
                            <SelectItem value="prep">General Preparation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={addTask}
                        className="bg-amber-600 text-white hover:bg-amber-700 w-full rounded-xl py-6 text-lg font-bold"
                      >
                        Add to Checklist
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </motion.div>

          {/* Checklist Sections */}
          <div className="space-y-10">
            {categories.map((cat, catIdx) => {
              const items = currentChecklist.filter(item => item.category === cat.id);
              if (items.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className={cn("p-2 rounded-xl", cat.color)}>
                      <cat.icon className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">{cat.label}</h2>
                    <div className="flex-1 h-[1px] bg-slate-200"></div>
                  </div>

                  <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                      {items.map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: (catIdx * 0.1) + (idx * 0.05) }}
                          className={cn(
                            "group relative overflow-hidden rounded-[24px] transition-all duration-300",
                            item.checked ? "opacity-60" : "hover:shadow-md"
                          )}
                        >
                          <div 
                            className={cn(
                                "relative bg-white rounded-[24px] p-5 flex items-center gap-4 cursor-pointer border transition-all",
                                item.checked ? "border-slate-100 bg-slate-50/50" : "border-slate-100 hover:border-amber-200 shadow-sm"
                            )}
                            onClick={() => handleCheckboxChange(item.id, !item.checked)}
                          >
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                              item.checked ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400 group-hover:text-amber-600"
                            )}>
                              {item.checked ? (
                                <CheckCircle2 className="w-6 h-6 animate-in zoom-in duration-300" />
                              ) : (
                                <item.icon className="w-6 h-6" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-base font-semibold transition-all duration-300",
                                item.checked ? "text-slate-400 line-through" : "text-slate-900"
                              )}>
                                {item.text}
                              </p>
                            </div>

                            {/* Action Area */}
                            <div className="flex items-center gap-2">
                              {!item.checked && (
                                <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-amber-400 transition-colors">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-100 group-hover:bg-amber-400"></div>
                                </div>
                              )}
                              
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-10 h-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => deleteTask(e, item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset Action */}
          <div className="flex flex-col items-center gap-6 pt-10">
            {completionPercentage === 100 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-3 bg-white p-6 rounded-[32px] shadow-xl shadow-amber-100 border border-amber-50 mb-4"
              >
                <PartyPopper className="w-12 h-12 text-amber-600" />
                <p className="text-slate-900 font-bold text-lg text-center">Truly a Blessed Eid!</p>
              </motion.div>
            )}

            <Button
              variant="outline"
              onClick={resetChecklist}
              className="border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl px-8 h-12 transition-all"
            >
              <RotateCcw className="w-3 h-3 mr-2" />
              Reset All Tasks
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
