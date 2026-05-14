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

local function sort_key(text)
  return stringify(text):lower()
end

local function latex_cell(blocks)
  local rendered = stringify(blocks)
  rendered = rendered:gsub("%s*\n%s*", " ")
  return escape_latex(trim(rendered))
end

local function header_identifier(header)
  if header.identifier and header.identifier ~= "" then
    return header.identifier
  end

  return stringify(header.content)
    :lower()
    :gsub("[^%w]+", "-")
    :gsub("^-+", "")
    :gsub("-+$", "")
end
 
local function entry_label_name(entry_id)
  return "monster-entry:" .. entry_id
end

local function add_entry_label(blocks, entry_id)
  local labeled = {}
  local inserted = false

  for _, block in ipairs(blocks) do
    table.insert(labeled, block)
    if not inserted and block.t == "Header" and block.level == 3 then
      table.insert(labeled, pandoc.RawBlock("latex", "\\label{" .. entry_label_name(entry_id) .. "}"))
      inserted = true
    end
  end

  return labeled
end

local function is_pdf_pagebreak_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("pagebreak-pdf")
end

local function is_pdf_columnbreak_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("columnbreak-pdf")
end

local function is_pdf_twocolumn_begin_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("twocolumn-pdf-begin")
end

local function is_pdf_twocolumn_end_div(block)
  return block.t == "Div" and block.classes and block.classes:includes("twocolumn-pdf-end")
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
    if is_pdf_pagebreak_div(block) then
      for _, raw in ipairs(pagebreak_blocks(true)) do
        table.insert(processed, raw)
      end
    elseif is_pdf_columnbreak_div(block) then
      for _, raw in ipairs(columnbreak_blocks(true)) do
        table.insert(processed, raw)
      end
    elseif block.t == "Table" then
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
    if is_pdf_pagebreak_div(block) then
      for _, raw in ipairs(pagebreak_blocks(in_columns)) do
        table.insert(processed, raw)
      end
    elseif is_pdf_columnbreak_div(block) then
      for _, raw in ipairs(columnbreak_blocks(in_columns)) do
        table.insert(processed, raw)
      end
    elseif block.t == "Table" and #block.headers > 2 then
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

local function process_two_column_section(blocks)
  local grouped = group_monster_entries(blocks)
  local rebuilt = {}
  local index_entries = {}

  table.insert(rebuilt, pandoc.RawBlock("latex", "\\begin{multicols}{2}"))

  for _, block in ipairs(grouped) do
    if block.t == "Div" and block.classes:includes("monster-entry") then
      local entry_name = header_text_from_entry(block)
      local entry_header = block.content[1]
      local entry_id = header_identifier(entry_header)
      local processor = process_regular_entry_for_latex
      if entry_name and full_width_entries[entry_name] then
        processor = process_full_width_tables_entry
      end

      table.insert(index_entries, { name = entry_name, id = entry_id })

      for _, inner in ipairs(processor(add_entry_label(block.content, entry_id))) do
        table.insert(rebuilt, inner)
      end
    elseif is_pdf_pagebreak_div(block) then
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

  table.insert(rebuilt, pandoc.RawBlock("latex", "\\end{multicols}"))
  table.sort(index_entries, function(a, b)
    return sort_key(a.name) < sort_key(b.name)
  end)

  return rebuilt, index_entries
end

local function build_index_section(index_entries)
  if #index_entries == 0 then
    return {}
  end

  local lines = {
    "\\clearpage",
    "\\section*{Index}",
    "\\phantomsection",
    "\\addcontentsline{toc}{section}{Index}",
    "\\markboth{Index}{Index}",
    "\\begingroup",
    "\\small",
    "\\setlength{\\LTleft}{0pt}",
    "\\setlength{\\LTright}{0pt}",
    "\\begin{longtable}{@{}p{0.86\\textwidth}r@{}}",
  }

  for _, entry in ipairs(index_entries) do
    table.insert(
      lines,
      "\\hyperref[" .. entry_label_name(entry.id) .. "]{" .. escape_latex(entry.name) .. "} & "
        .. "\\hyperref[" .. entry_label_name(entry.id) .. "]{\\pageref*{" .. entry_label_name(entry.id) .. "}} \\\\"
    )
  end

  table.insert(lines, "\\end{longtable}")
  table.insert(lines, "\\endgroup")

  return { pandoc.RawBlock("latex", table.concat(lines, "\n")) }
end

function Pandoc(doc)
  if FORMAT:match("html") then
    return doc
  end

  if FORMAT:match("latex") then
    local rebuilt = {}
    local twocolumn_blocks = nil
    local index_entries = {}

    local function flush_twocolumn()
      if not twocolumn_blocks then
        return
      end

      local section_blocks, section_index_entries = process_two_column_section(twocolumn_blocks)

      for _, inner in ipairs(section_blocks) do
        table.insert(rebuilt, inner)
      end

      for _, entry in ipairs(section_index_entries) do
        table.insert(index_entries, entry)
      end

      twocolumn_blocks = nil
    end

    for _, block in ipairs(doc.blocks) do
      if is_pdf_twocolumn_begin_div(block) then
        flush_twocolumn()
        twocolumn_blocks = {}
      elseif is_pdf_twocolumn_end_div(block) then
        flush_twocolumn()
      elseif twocolumn_blocks then
        table.insert(twocolumn_blocks, block)
      elseif is_pdf_pagebreak_div(block) then
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
    end

    flush_twocolumn()

    for _, block in ipairs(build_index_section(index_entries)) do
      table.insert(rebuilt, block)
    end

    return pandoc.Pandoc(rebuilt, doc.meta)
  end

  return doc
end
