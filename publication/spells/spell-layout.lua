local function stringify(inlines)
  return pandoc.utils.stringify(inlines)
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
      table.insert(rebuilt, block)
    elseif index == marker_index + 1 then
      table.insert(rebuilt, pandoc.RawBlock("latex", "\\begin{multicols}{2}"))
      table.insert(rebuilt, block)
    else
      table.insert(rebuilt, block)
    end
  end

  table.insert(rebuilt, pandoc.RawBlock("latex", "\\end{multicols}"))
  return pandoc.Pandoc(rebuilt, doc.meta)
end
