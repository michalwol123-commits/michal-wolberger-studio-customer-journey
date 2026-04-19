import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import ReactMarkdown from 'react-markdown';

export default function GuideSection({ section }) {
  const Icon = section.icon;

  return (
    <AccordionItem value={section.id} className="border rounded-xl bg-card shadow-sm mb-3 overflow-hidden">
      <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/20">
        <div className="flex items-center gap-3 w-full">
          <div className={`p-2 rounded-lg ${section.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-heading font-semibold text-base">{section.title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-4">
        <Accordion type="multiple" className="space-y-2 mt-2">
          {section.items.map((item, idx) => (
            <AccordionItem
              key={idx}
              value={`${section.id}-${idx}`}
              className="border rounded-lg bg-background overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline hover:bg-muted/20">
                <span className="font-medium">{item.title}</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                  <ReactMarkdown
                    components={{
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
                          <table className="w-full text-sm border-collapse border border-border rounded-lg">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
                      th: ({ children }) => <th className="text-right px-3 py-2 border border-border font-medium text-xs">{children}</th>,
                      td: ({ children }) => <td className="text-right px-3 py-2 border border-border text-xs">{children}</td>,
                      p: ({ children }) => <p className="my-2">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc mr-5 my-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal mr-5 my-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-sm">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                    }}
                  >
                    {item.content}
                  </ReactMarkdown>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </AccordionContent>
    </AccordionItem>
  );
}