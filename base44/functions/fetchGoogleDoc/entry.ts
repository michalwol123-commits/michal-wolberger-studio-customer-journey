import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { file_id } = await req.json();
    if (!file_id) {
      return Response.json({ error: 'Missing file_id' }, { status: 400 });
    }

    // Use Google Docs API to read document content as structured JSON
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledocs");

    const docRes = await fetch(
      `https://docs.googleapis.com/v1/documents/${file_id}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!docRes.ok) {
      const errText = await docRes.text();
      return Response.json({ error: `Docs API failed: ${docRes.status} - ${errText}` }, { status: docRes.status });
    }

    const doc = await docRes.json();

    // Extract plain text from the document body
    let text = '';
    if (doc.body?.content) {
      for (const element of doc.body.content) {
        if (element.paragraph?.elements) {
          for (const el of element.paragraph.elements) {
            if (el.textRun?.content) {
              text += el.textRun.content;
            }
          }
        }
        if (element.table) {
          for (const row of element.table.tableRows || []) {
            for (const cell of row.tableCells || []) {
              for (const cellContent of cell.content || []) {
                if (cellContent.paragraph?.elements) {
                  for (const el of cellContent.paragraph.elements) {
                    if (el.textRun?.content) {
                      text += el.textRun.content;
                    }
                  }
                }
              }
              text += '\t';
            }
            text += '\n';
          }
        }
      }
    }

    return Response.json({ text, title: doc.title || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});