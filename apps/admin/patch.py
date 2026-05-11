import re
with open('components/compass/DiffReviewer.tsx', 'r') as f:
    content = f.read()

# 1. Update MissionsGeneration type
content = content.replace('  costUsd: number;\n};\n\ntype Generation =', '  costUsd: number;\n  input?: any;\n};\n\ntype Generation =')

# 2. Update Props
content = content.replace('  onAccepted: () => void;\n};\n\nexport function DiffReviewer({ generation, seasonId, entityId, entityType, onClose, onAccepted }: Props) {', '  onAccepted: () => void;\n  onUpdateGeneration?: (newGen: any) => void;\n};\n\nexport function DiffReviewer({ generation, seasonId, entityId, entityType, onClose, onAccepted, onUpdateGeneration }: Props) {')

# 3. Update MissionsReviewer call
content = content.replace('        setError={setError}\n        onClose={onClose}\n        onAccepted={onAccepted}\n      />\n    );\n  }\n\n  return null;', '        setError={setError}\n        onClose={onClose}\n        onAccepted={onAccepted}\n        onUpdateGeneration={onUpdateGeneration}\n      />\n    );\n  }\n\n  return null;')

# 4. Update ReviewerCommonProps
content = content.replace('  onAccepted: () => void;\n};\n\nfunction ChapterArcReviewer({', '  onAccepted: () => void;\n  onUpdateGeneration?: (newGen: any) => void;\n};\n\nfunction ChapterArcReviewer({')

# 5. Add refinement UI at the bottom of MissionsReviewer
old_ui = '          </div>\n        ))}\n      </div>\n    </Modal>\n  );\n}'

new_ui = """          </div>
        ))}

        {/* Refinement Area */}
        {generation.input && onUpdateGeneration && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <label className="text-xs font-semibold text-stone-700">Refine with AI</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Make the outdoor missions focus more on finding bugs..."
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRefine();
                  }
                }}
                disabled={isPending || isRefining}
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-huntly-sage focus:outline-none focus:ring-1 focus:ring-huntly-sage disabled:bg-stone-100"
              />
              <button
                type="button"
                onClick={handleRefine}
                disabled={isPending || isRefining || !refinePrompt.trim()}
                className="shrink-0 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {isRefining ? "Refining…" : "Refine"}
              </button>
            </div>
            <p className="text-xs text-stone-500">
              Compass will read these generated missions and adjust them based on your feedback.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}"""

content = content.replace(old_ui, new_ui)

with open('components/compass/DiffReviewer.tsx', 'w') as f:
    f.write(content)
