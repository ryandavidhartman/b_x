local function stringify(inlines)
  return pandoc.utils.stringify(inlines)
end

local function is_pdf_pagebreak_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("pagebreak-pdf")
end

local function is_pdf_columnbreak_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("columnbreak-pdf")
end

local function pagebreak_blocks(in_columns)
  local blocks = {}

  if in_columns then
    table.insert(blocks, pandoc.RawBlock("latex", "\\end{multicols}"))
  end

  table.insert(blocks, pandoc.RawBlock("latex", "\\newpage"))

  if in_columns then
    table.insert(blocks, pandoc.RawBlock("latex", "\\begin{multicols}{2}"))
  end

  return blocks
end

local function columnbreak_blocks(in_columns)
  if not in_columns then
    return {}
  end

  return { pandoc.RawBlock("latex", "\\columnbreak") }
end

function Pandoc(doc)
  if FORMAT:match("html") then
    return doc
  end

  if not FORMAT:match("latex") then
    return doc
  end

  local marker_index = nil

  for index, block in ipairs(doc.blocks) do
    if block.t == "Header" and block.level == 2 and stringify(block.content) == "Spell Descriptions" then
      marker_index = index
      break
    end
  end

  if not marker_index then
    return doc
  end

  local rebuilt = {}

  for index, block in ipairs(doc.blocks) do
    if index <= marker_index then
      if is_pdf_pagebreak_div(block) then
        for _, raw in ipairs(pagebreak_blocks(false)) do
          table.insert(rebuilt, raw)
        end
      elseif is_pdf_columnbreak_div(block) then
        for _, raw in ipairs(columnbreak_blocks(false)) do
          table.insert(rebuilt, raw)
        end
      else
        table.insert(rebuilt, block)
      end
    elseif index == marker_index + 1 then
      table.insert(rebuilt, pandoc.RawBlock("latex", "\\begin{multicols}{2}"))
      if is_pdf_pagebreak_div(block) then
        for _, raw in ipairs(pagebreak_blocks(true)) do
          table.insert(rebuilt, raw)
        end
      elseif is_pdf_columnbreak_div(block) then
        for _, raw in ipairs(columnbreak_blocks(true)) do
          table.insert(rebuilt, raw)
        end
      else
        table.insert(rebuilt, block)
      end
    else
      if is_pdf_pagebreak_div(block) then
        for _, raw in ipairs(pagebreak_blocks(true)) do
          table.insert(rebuilt, raw)
        end
      elseif is_pdf_columnbreak_div(block) then
        for _, raw in ipairs(columnbreak_blocks(true)) do
          table.insert(rebuilt, raw)
        end
      else
        table.insert(rebuilt, block)
      end
    end
  end

  table.insert(rebuilt, pandoc.RawBlock("latex", "\\end{multicols}"))
  return pandoc.Pandoc(rebuilt, doc.meta)
end
