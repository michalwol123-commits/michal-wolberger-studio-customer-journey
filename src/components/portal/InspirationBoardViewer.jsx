import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import ArtIcon from './ArtIcon';
import MoodBoardBuilder from '@/components/projects/MoodBoardBuilder';

function LinkPreviewCard({ url, title }) {
  const [preview, setPreview] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data?.data?.image?.url) {
          setPreview(data.data.image.url);
        } else {
          setFailed(true);
        }
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [url]);

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      {preview ? (
        <img src={preview} alt={title || url} className="w-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4 gap-2 text-primary hover:bg-accent/20">
          {failed ? <span className="text-xs underline" style={{ color: '#4a3728' }}>פתיחת קישור ←</span> : <Loader2 size={28} className="animate-spin text-muted-foreground" />}
          <span className="text-xs text-center text-muted-foreground">{title || url}</span>
        </div>
      )}
    </a>
  );
}

const REACTIONS = [
  { value: 'love', label: 'אוהבת!' },
  { value: 'like', label: 'נחמד' },
  { value: 'neutral', label: 'לא בטוחה' },
  { value: 'dislike', label: 'לא בשבילי' },
];
const TYPE_LABELS = { render: 'רנדר', inspiration: 'השראה', texture: 'טקסטורה', sketch: 'סקיצה', material: 'חומרים' };
const FILTER_LABELS = { all: 'הכל', render: 'רנדרים', inspiration: 'השראה', texture: 'טקסטורות', sketch: 'סקיצות', material: 'חומרים' };
const APPROVABLE_CATEGORIES = ['inspiration', 'texture', 'sketch', 'material'];
const CATEGORY_LABELS = { inspiration: 'השראה', texture: 'טקסטורות', sketch: 'סקיצות', material: 'חומרים' };

export default function InspirationBoardViewer({ projectId, project: projectProp, onConceptApproved }) {
  const queryClient = useQueryClient();
  const [localProject, setLocalProject] = useState(projectProp);
  const [commentMap, setCommentMap] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvingCategory, setApprovingCategory] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showRenderSuggest, setShowRenderSuggest] = useState(false);
  const [renderPrompt, setRenderPrompt] = useState('');
  const [submittingRender, setSubmittingRender] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [selectedUploadType, setSelectedUploadType] = useState('inspiration');
  const [showMoodBoard, setShowMoodBoard] = useState(false);
  const [zoomedItem, setZoomedItem] = useState(null);

  // Sync with prop when it changes from above
  useEffect(() => { setLocalProject(projectProp); }, [projectProp?.id, projectProp?.concept_status, projectProp?.concept_approved_categories?.length]);

  const reloadProject = async () => {
    const fresh = await base44.entities.Project.get(projectId);
    setLocalProject(fresh);
  };

  const conceptApproved = localProject?.concept_status === 'approved';
  const approvedCategories = localProject?.concept_approved_categories || [];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inspiration-items-portal', projectId],
    queryFn: () => base44.entities.InspirationItem.filter({ project_id: projectId }, 'order'),
    enabled: !!projectId,
  });

  // Show approved items + all client-uploaded items (even if not yet approved by staff)
  const visibleItems = items.filter(i => i.is_approved || i.uploader_role === 'client');

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['inspiration-items-portal', projectId] });
  const refetchProject = () => queryClient.invalidateQueries({ queryKey: ['portal-projects'] });

  // Categories that actually have items
  const categoriesWithItems = APPROVABLE_CATEGORIES.filter(cat =>
    visibleItems.some(i => i.type === cat)
  );

  const handleReaction = async (item, reaction) => {
    setSavingId(item.id + '_r');
    await base44.entities.InspirationItem.update(item.id, {
      client_reaction: item.client_reaction === reaction ? 'none' : reaction,
    });
    refetch();
    setSavingId(null);
  };

  const handleComment = async (item) => {
    setSavingId(item.id + '_c');
    await base44.entities.InspirationItem.update(item.id, { client_comment: commentMap[item.id] ?? '' });
    refetch();
    setSavingId(null);
  };

  const handleClientUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const r = await base44.integrations.Core.UploadFile({ file });
    if (r?.file_url) {
      await base44.entities.InspirationItem.create({
        project_id: projectId, uploader_role: 'client',
        type: selectedUploadType,
        file_url: r.file_url, title: 'השראה שלי: ' + file.name.replace(/\.[^.]+$/, ''),
        is_approved: false, order: items.length + 100,
      });
      refetch();
    }
    setUploading(false);
  };

  const handleApproveCategory = async (category) => {
    setApprovingCategory(category);
    const updated = [...new Set([...approvedCategories, category])];
    await base44.entities.Project.update(projectId, { concept_approved_categories: updated });
    await reloadProject();
    setApprovingCategory(null);
  };

  const handleRevokeCategoryApproval = async (category) => {
    setApprovingCategory(category);
    const updated = approvedCategories.filter(c => c !== category);
    await base44.entities.Project.update(projectId, { concept_approved_categories: updated });
    await reloadProject();
    setApprovingCategory(null);
  };

  const handleApproveAll = async () => {
    setApproving(true);
    await base44.entities.Project.update(projectId, { concept_status: 'approved' });
    if (onConceptApproved) onConceptApproved();
    await reloadProject();
    setApproving(false);
  };

  const handleRevokeAll = async () => {
    setApproving(true);
    await base44.entities.Project.update(projectId, {
      concept_status: 'pending',
      concept_approved_categories: [],
    });
    await reloadProject();
    setApproving(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <ArtIcon name="palette" size={88} />
        <h3 className="p-display text-xl">לוח ההשראה בהכנה</h3>
        <p className="text-sm" style={{ color: '#8a7060' }}>מיכל עובדת על לוח ההשראה שלך. ברגע שיהיה מוכן תקבלי הודעה.</p>
      </div>
    );
  }

  const isCategoryApproved = (cat) => approvedCategories.includes(cat);
  const isApprovableTab = APPROVABLE_CATEGORIES.includes(activeFilter);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center">
        <div className="flex justify-center mb-4"><ArtIcon name="heart" size={64} /></div>
        <p className="p-label mb-2">הקונספט שלך מתגבש</p>
        <h2 className="p-display text-2xl md:text-3xl">לוח ההשראה שלך</h2>
        <p className="mt-2 text-sm" style={{ color: '#8a7060' }}>עברי על התמונות, הגיבי לכל אחת ובסוף אשרי את הקונספט</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(FILTER_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setActiveFilter(key)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${activeFilter === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary'}`}>
            {label}
            {APPROVABLE_CATEGORIES.includes(key) && isCategoryApproved(key) && ' ✓'}
          </button>
        ))}
      </div>

      {/* AI Render */}
      <div>
        <button onClick={() => setShowRenderSuggest(!showRenderSuggest)}
          className="flex items-center gap-2 text-sm hover:underline" style={{ color: '#2a1f18' }}>
          ✦ צור רנדר AI
        </button>
        {showRenderSuggest && (
          <div className="mt-2 p-3 space-y-2" style={{ background: '#f0ebe4', border: '1px solid #e0d8ce' }}>
            <Textarea placeholder="תארי את החזון העיצובי שלך..." value={renderPrompt} onChange={e => setRenderPrompt(e.target.value)} className="text-right" rows={3} />
            <Button size="sm" disabled={submittingRender || !renderPrompt.trim()} onClick={async () => {
              setSubmittingRender(true);
              const result = await base44.integrations.Core.GenerateImage({ prompt: renderPrompt.trim() });
              if (result?.url) {
                await base44.entities.InspirationItem.create({
                  project_id: projectId, uploader_role: 'client', type: 'render',
                  file_url: result.url, ai_prompt: renderPrompt.trim(),
                  title: 'רנדר AI: ' + renderPrompt.substring(0, 40),
                  is_approved: false, order: items.length,
                });
                refetch();
              }
              setRenderPrompt(''); setShowRenderSuggest(false); setSubmittingRender(false);
            }}>
              {submittingRender ? <><Loader2 size={14} className="animate-spin ml-1" /> יוצר רנדר...</> : <>✦ צור רנדר</>}
            </Button>
          </div>
        )}
      </div>

      {/* Masonry grid */}
      <div className="columns-2 md:columns-3 gap-3">
        {(activeFilter === 'all' ? visibleItems : visibleItems.filter(i => i.type === activeFilter)).map(item => (
          <div key={item.id} className="break-inside-avoid mb-3 rounded-xl overflow-hidden border bg-card shadow-sm relative">
            <span className="absolute top-2 right-2 text-xs px-2 py-0.5 z-10"
              style={item.uploader_role === 'staff'
                ? { background: '#2a1f18', color: '#f5f0eb' }
                : { background: '#f0ebe4', color: '#4a3728', border: '1px solid #e0d8ce' }}>
              {item.uploader_role === 'staff' ? 'מיכל' : 'לקוחה'}
            </span>
            {item.ai_prompt && !item.file_url && !item.external_url ? (
              <div className="flex items-center min-h-[80px] p-4 italic text-sm" style={{background:'#f3f0eb', color:'#555'}}>
                הצעת רנדר: {item.ai_prompt}
              </div>
            ) : item.file_url ? (
              <img src={item.file_url} alt={item.title || ''} className="w-full object-cover cursor-zoom-in" onClick={() => setZoomedItem(item.file_url)} />
            ) : item.external_url ? (
              <LinkPreviewCard url={item.external_url} title={item.title} />
            ) : null}

            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{TYPE_LABELS[item.type] || item.type}</span>
                {item.uploader_role === 'client' && (
                  <span className="text-xs px-2 py-0.5" style={{ background: '#eef0e4', color: '#6b7a4f' }}>השראה שלי</span>
                )}
              </div>
              {item.title && <p className="text-xs font-medium text-foreground">{item.title}</p>}

              {/* Staff reply */}
              {item.staff_reply && (
                <div className="p-2 text-xs" style={{ background: '#f0ebe4', border: '1px solid #e0d8ce' }}>
                  <span className="font-medium" style={{ color: '#2a1f18' }}>מיכל: </span>
                  <span style={{ color: '#4a3728' }}>{item.staff_reply}</span>
                </div>
              )}

              {/* Reactions */}
              <div className="flex gap-1.5 flex-wrap">
                {REACTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleReaction(item, opt.value)}
                    disabled={savingId === item.id + '_r'}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all ${
                      item.client_reaction === opt.value
                        ? 'bg-primary border-primary text-primary-foreground scale-105'
                        : 'bg-card border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Comment */}
              <Textarea
                placeholder="הערה..."
                rows={2}
                value={commentMap[item.id] ?? item.client_comment ?? ''}
                onChange={e => setCommentMap(m => ({ ...m, [item.id]: e.target.value }))}
                className="text-xs resize-none"
              />
              {commentMap[item.id] !== undefined && commentMap[item.id] !== (item.client_comment ?? '') && (
                <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => handleComment(item)} disabled={savingId === item.id + '_c'}>
                  שמור הערה
                </Button>
              )}

              {item.uploader_role === 'client' && (
                <div className="flex gap-2 mt-1">
                  <button onClick={() => { const t = prompt('כותרת חדשה:', item.title); if(t) base44.entities.InspirationItem.update(item.id, { title: t }).then(refetch); }}
                    className="text-xs text-gray-500 hover:text-gray-700 underline">עריכה</button>
                  <button onClick={() => { if(confirm('למחוק?')) base44.entities.InspirationItem.delete(item.id).then(refetch); }}
                    className="text-xs text-red-400 hover:text-red-600 underline">מחיקה</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Category approval (only on specific category tabs, not "all" or "render") */}
      {isApprovableTab && items.some(i => i.type === activeFilter) && (
        <div className="p-4 text-center space-y-2"
          style={isCategoryApproved(activeFilter)
            ? { border: '1px solid #6b7a4f', background: '#eef0e4' }
            : { border: '1px solid #e0d8ce', background: '#f0ebe4' }}>
          {isCategoryApproved(activeFilter) ? (
            <>
              <div className="flex items-center justify-center gap-2 font-medium" style={{ color: '#6b7a4f' }}>
                <span>✓ קטגוריית {CATEGORY_LABELS[activeFilter]} אושרה</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleRevokeCategoryApproval(activeFilter)}
                disabled={approvingCategory === activeFilter}>
                {approvingCategory === activeFilter ? <Loader2 size={14} className="animate-spin ml-1" /> : null}
                ביטול אישור קטגוריה
              </Button>
            </>
          ) : (
            <Button onClick={() => handleApproveCategory(activeFilter)}
              disabled={approvingCategory === activeFilter}
              className="px-6">
              {approvingCategory === activeFilter ? <Loader2 size={14} className="animate-spin ml-1" /> : null}
              ✓ אישרתי קטגוריה זו
            </Button>
          )}
        </div>
      )}

      {/* Client upload & link */}
      <div className="p-6 text-center space-y-3" style={{ border: '1px dashed #c8bdb2' }}>
        <div className="flex justify-center"><ArtIcon name="palette" size={56} floatDelay={2} /></div>
        <p className="text-sm text-muted-foreground">יש לך תמונות השראה משלך? העלי כאן</p>
        <div className="flex justify-center">
          <select value={selectedUploadType} onChange={e => setSelectedUploadType(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-card text-foreground">
            <option value="inspiration">השראה</option>
            <option value="texture">טקסטורה</option>
            <option value="sketch">סקיצה</option>
            <option value="material">חומרים</option>
          </select>
        </div>
        <div className="flex justify-center gap-3 flex-wrap">
          <label className="cursor-pointer">
            <span className="inline-block px-4 py-2 border border-primary text-primary rounded-lg text-sm hover:bg-accent/20">
              {uploading ? 'מעלה...' : 'בחרי תמונה'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleClientUpload} disabled={uploading} />
          </label>
          <button onClick={() => setShowLinkForm(!showLinkForm)}
             className="px-4 py-2 border border-primary text-primary rounded-lg text-sm hover:bg-accent/20">
              הוסף קישור
            </button>
            <button onClick={() => setShowMoodBoard(true)}
              className="px-4 py-2 border border-primary text-primary rounded-lg text-sm hover:bg-accent/20">
              צור מוד בורד
            </button>
          </div>
        {showLinkForm && (
          <div className="mt-3 p-3 bg-muted/30 border rounded-lg space-y-2 text-right">
            <input placeholder="כתובת URL (Pinterest, Houzz...)" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" dir="ltr" />
            <input placeholder="כותרת (אופציונלי)" value={linkTitle} onChange={e => setLinkTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
            <Button size="sm" disabled={!linkUrl.trim()} onClick={async () => {
              await base44.entities.InspirationItem.create({
                project_id: projectId, uploader_role: 'client',
                type: selectedUploadType,
                external_url: linkUrl.trim(), title: linkTitle.trim() || linkUrl.trim(),
                is_approved: false, order: items.length,
              });
              setLinkUrl(''); setLinkTitle(''); setShowLinkForm(false); refetch();
            }}>הוסף</Button>
          </div>
        )}
      </div>

      {/* Category checklist + Global concept approval */}
      <div className="p-6 text-center space-y-4"
        style={conceptApproved
          ? { border: '1px solid #6b7a4f', background: '#eef0e4' }
          : { border: '1px solid #2a1f18', background: '#fffdfa' }}>
        {conceptApproved ? (
          <>
            <div className="flex justify-center"><ArtIcon name="check" size={64} /></div>
            <h3 className="p-display text-xl" style={{ color: '#6b7a4f' }}>הקונספט אושר!</h3>
            <p className="text-sm" style={{ color: '#6b7a4f' }}>תודה! מיכל תמשיך לשלב הבא.</p>
            <Button size="sm" variant="outline" onClick={handleRevokeAll} disabled={approving}>
              {approving ? <Loader2 size={14} className="animate-spin ml-1" /> : null}
              ביטול אישור קונספט
            </Button>
          </>
        ) : (
          <>
            <p className="p-label">רגע חשוב</p>
            <h3 className="p-display text-xl">אישור קונספט עיצובי</h3>
            <p className="text-sm" style={{ color: '#8a7060' }}>אשרי כל קטגוריה בנפרד, ואז אשרי את הקונספט</p>

            {/* Category checklist */}
            {categoriesWithItems.length > 0 && (
              <div className="space-y-2 text-right max-w-xs mx-auto">
                {categoriesWithItems.map(cat => {
                  const catApproved = approvedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => catApproved ? handleRevokeCategoryApproval(cat) : handleApproveCategory(cat)}
                      disabled={approvingCategory === cat}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                      style={catApproved
                        ? { background: '#eef0e4', border: '1px solid #6b7a4f', color: '#6b7a4f' }
                        : { background: '#fffdfa', border: '1px solid #e0d8ce', color: '#8a7060' }}
                    >
                      {approvingCategory === cat ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : catApproved ? (
                        <span style={{ color: '#6b7a4f' }}>✓</span>
                      ) : (
                        <span className="w-4 h-4 rounded-full inline-block" style={{ border: '1.5px solid #c8bdb2' }} />
                      )}
                      <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                      <span className="mr-auto text-xs text-muted-foreground">
                        ({items.filter(i => i.type === cat).length} פריטים)
                      </span>
                    </button>
                  );
                })}
                <p className="text-xs text-muted-foreground text-center mt-1">
                  אושרו {approvedCategories.filter(c => categoriesWithItems.includes(c)).length}/{categoriesWithItems.length} קטגוריות
                </p>
              </div>
            )}

            <Button onClick={handleApproveAll} disabled={approving} className="px-8 py-3 text-base font-semibold">
              {approving ? <><Loader2 size={18} className="animate-spin ml-2" /> שומרת...</> : '✓ אישרתי את הקונספט!'}
            </Button>
          </>
        )}
        </div>

        {zoomedItem && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedItem(null)}>
            <img src={zoomedItem} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        )}

        {showMoodBoard && (
          <MoodBoardBuilder
            items={visibleItems}
            projectName={localProject?.name}
            projectId={projectId}
            onClose={() => setShowMoodBoard(false)}
            onSaved={() => { refetch(); setShowMoodBoard(false); }}
          />
        )}
        </div>
        );
        }