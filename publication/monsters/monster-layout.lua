local function stringify(inlines)
  return pandoc.utils.stringify(inlines)
end

local function trim(text)
  return text:gsub("^%s+", ""):gsub("%s+$", "")
end

local function escape_latex(text)
  local replacements = {
    ["\\"] = "\\textbackslash{}",
    ["{"] = "\\{",
    ["}"] = "\\}",
    ["$"] = "\\$",
    ["&"] = "\\&",
    ["#"] = "\\#",
    ["%"] = "\\%",
    ["_"] = "\\_",
  }

  return (text:gsub("[\\{}$&#%%_]", replacements))
end

local function latex_cell(blocks)
  local rendered = stringify(blocks)
  rendered = rendered:gsub("%s*\n%s*", " ")
  return escape_latex(trim(rendered))
end

local full_width_entries = {
  Bear = true,
  ["Cat, Great"] = true,
  Dragon = true,
  ["Fish, Giant"] = true,
  Giant = true,
  Hawk = true,
  Horse = true,
  ["Lizards, Giant"] = true,
  ["Lycanthrope*"] = true,
  Men = true,
  ["NPC Parties"] = true,
  Snake = true,
  ["Spider, Giant"] = true,
}

local function group_monster_entries(blocks)
  local grouped = {}
  local current_blocks = nil
  local current_classes = nil

  local function flush_current()
    if current_blocks then
      table.insert(grouped, pandoc.Div(current_blocks, pandoc.Attr("", current_classes)))
      current_blocks = nil
      current_classes = nil
    end
  end

  for _, block in ipairs(blocks) do
    if block.t == "Header" and block.level == 3 then
      flush_current()
      current_blocks = { block }
      current_classes = { "monster-entry" }
    elseif block.t == "Header" and block.level <= 2 then
      flush_current()
      table.insert(grouped, block)
    elseif current_blocks then
      table.insert(current_blocks, block)
    else
      table.insert(grouped, block)
    end
  end

  flush_current()

  return grouped
end

local function table_column_spec(column_count)
  if column_count == 1 then
    return "@{}X@{}"
  end

  local spec = { "@{}l" }
  for _ = 2, column_count do
    table.insert(spec, "X")
  end
  table.insert(spec, "@{}")
  return table.concat(spec, "")
end

local function table_to_tabularx(tbl, width_macro)
  local lines = {}
  local header_cells = {}
  local column_count = #tbl.headers
  local column_spec = table_column_spec(column_count)
  local table_width = width_macro or "\\columnwidth"

  for _, cell in ipairs(tbl.headers) do
    table.insert(header_cells, latex_cell(cell))
  end

  table.insert(lines, "\\begin{center}")
  table.insert(lines, "\\small")
  table.insert(lines, "\\begin{tabularx}{" .. table_width .. "}{" .. column_spec .. "}")
  table.insert(lines, "\\toprule")
  table.insert(lines, table.concat(header_cells, " & ") .. " \\\\")
  table.insert(lines, "\\midrule")

  for _, row in ipairs(tbl.rows) do
    local row_cells = {}
    for _, cell in ipairs(row) do
      table.insert(row_cells, latex_cell(cell))
    end
    table.insert(lines, table.concat(row_cells, " & ") .. " \\\\")
  end

  table.insert(lines, "\\bottomrule")
  table.insert(lines, "\\end{tabularx}")
  table.insert(lines, "\\end{center}")

  return pandoc.RawBlock("latex", table.concat(lines, "\n"))
end

local function process_regular_entry_for_latex(blocks)
  local processed = {}

  for _, block in ipairs(blocks) do
    if block.t == "Table" then
      table.insert(processed, table_to_tabularx(block, "\\columnwidth"))
    else
      table.insert(processed, block)
    end
  end

  return processed
end

local function header_text_from_entry(div)
  if not div or div.t ~= "Div" or not div.content or not div.content[1] then
    return nil
  end

  local first = div.content[1]
  if first.t ~= "Header" then
    return nil
  end

  return stringify(first.content)
end

local function process_full_width_tables_entry(blocks)
  local processed = {}
  local in_columns = true

  local function end_columns()
    if in_columns then
      table.insert(processed, pandoc.RawBlock("latex", "\\end{multicols}"))
      in_columns = false
    end
  end

  local function begin_columns()
    if not in_columns then
      table.insert(processed, pandoc.RawBlock("latex", "\\begin{multicols}{2}"))
      in_columns = true
    end
  end

  for _, block in ipairs(blocks) do
    if block.t == "Table" and #block.headers > 2 then
      end_columns()
      table.insert(processed, table_to_tabularx(block, "\\textwidth"))
    else
      begin_columns()
      if block.t == "Table" then
        table.insert(processed, table_to_tabularx(block, "\\columnwidth"))
      else
        table.insert(processed, block)
      end
    end
  end

  begin_columns()
  return processed
end

function Pandoc(doc)
  local marker_index = nil

  for index, block in ipairs(doc.blocks) do
    if block.t == "Header" and block.level == 2 and stringify(block.content) == "Monster Descriptions" then
      marker_index = index
      break
    end
  end

  if not marker_index then
    return doc
  end

  local prefix = {}
  local suffix = {}

  for index, block in ipairs(doc.blocks) do
    if index <= marker_index then
      table.insert(prefix, block)
    else
      table.insert(suffix, block)
    end
  end

  local grouped = group_monster_entries(suffix)

  if FORMAT:match("html") then
    return doc
  end

  if FORMAT:match("latex") then
    local rebuilt = {}

    for _, block in ipairs(prefix) do
      table.insert(rebuilt, block)
    end

    table.insert(rebuilt, pandoc.RawBlock("latex", "\\begin{multicols}{2}"))

    for _, block in ipairs(grouped) do
      if block.t == "Div" and block.classes:includes("monster-entry") then
        local entry_name = header_text_from_entry(block)
        local processor = process_regular_entry_for_latex
        if entry_name and full_width_entries[entry_name] then
          processor = process_full_width_tables_entry
        end

        for _, inner in ipairs(processor(block.content)) do
          table.insert(rebuilt, inner)
        end
      else
        table.insert(rebuilt, block)
      end
    end

    table.insert(rebuilt, pandoc.RawBlock("latex", "\\end{multicols}"))
    return pandoc.Pandoc(rebuilt, doc.meta)
  end

  return doc
end
