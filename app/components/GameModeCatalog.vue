<template>
  <div class="catalog-overlay" @click="$emit('close')">
    <div class="catalog-container" @click.stop>
      <!-- Header -->
      <div class="catalog-header">
        <div class="header-content">
          <h2 class="catalog-title">📚 Mode Catalog & Chronicles</h2>
          <p class="catalog-subtitle">Discover the lore and legends behind each game mode</p>
        </div>
        <button @click="$emit('close')" class="close-btn">✕</button>
      </div>

      <!-- Content -->
      <div class="catalog-content">
        <!-- Search Bar -->
        <div class="search-section">
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search modes, lore, or abilities..."
              class="search-input"
            />
          </div>
          <div class="filter-tabs">
            <button
              v-for="category in categories"
              :key="category"
              @click="selectedCategory = category"
              class="filter-tab"
              :class="{ active: selectedCategory === category }"
            >
              {{ category === 'all' ? 'All Modes' : category }}
            </button>
          </div>
        </div>

        <!-- Mode Cards Grid -->
        <div class="modes-grid">
          <div
            v-for="mode in filteredModes"
            :key="mode.id"
            class="mode-catalog-card"
            :class="{ disabled: mode.disabled }"
            @click="!mode.disabled && selectMode(mode)"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="mode-icon-large">{{ mode.icon }}</div>
              <div class="mode-title-section">
                <h3 class="mode-title">{{ mode.name }}</h3>
                <div class="mode-category">{{ mode.category }}</div>
                <div v-if="mode.disabled" class="status-badge">{{ mode.status }}</div>
              </div>
            </div>

            <!-- Card Content -->
            <div class="card-content">
              <div class="mode-description">
                {{ getModeFullDescription(mode) }}
              </div>

              <div v-if="getModeLore(mode)" class="mode-lore">
                <h4 class="lore-title">📜 Legend</h4>
                <p class="lore-text">{{ getModeLore(mode) }}</p>
              </div>

              <div v-if="getModeAbilities(mode).length > 0" class="mode-abilities">
                <h4 class="abilities-title">⚡ Special Features</h4>
                <ul class="abilities-list">
                  <li v-for="ability in getModeAbilities(mode)" :key="ability" class="ability-item">
                    {{ ability }}
                  </li>
                </ul>
              </div>

              <div v-if="getModeStrategy(mode)" class="mode-strategy">
                <h4 class="strategy-title">🎯 Strategy Guide</h4>
                <p class="strategy-text">{{ getModeStrategy(mode) }}</p>
              </div>
            </div>

            <!-- Card Footer -->
            <div class="card-footer">
              <div class="mode-meta">
                <span v-if="mode.timeLimit" class="meta-item">
                  ⏱️ {{ mode.timeLimit }}s per move
                </span>
                <span class="meta-item">
                  👥 {{ getPlayerCount(mode) }}
                </span>
                <span class="meta-item">
                  🎲 {{ getDifficulty(mode) }}
                </span>
              </div>
              <button
                v-if="!mode.disabled"
                @click.stop="selectMode(mode)"
                class="select-mode-btn"
              >
                Play Mode
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface GameMode {
  id: string
  name: string
  icon: string
  description: string
  category: string
  disabled?: boolean
  status?: string
  timeLimit?: number
}

const props = defineProps<{
  allModes: GameMode[]
}>()

const emit = defineEmits<{
  close: []
  modeSelected: [mode: GameMode]
}>()

const searchQuery = ref('')
const selectedCategory = ref('all')

const categories = ref(['all', 'Core', 'Special Rules', 'Multiplayer', 'Board Variations', 'Power-ups'])

const filteredModes = computed(() => {
  let modes = props.allModes || []

  // Filter by category
  if (selectedCategory.value !== 'all') {
    modes = modes.filter(mode => mode.category === selectedCategory.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    modes = modes.filter(mode =>
      mode.name.toLowerCase().includes(query) ||
      mode.description.toLowerCase().includes(query) ||
      getModeFullDescription(mode).toLowerCase().includes(query) ||
      (getModeLore(mode) && getModeLore(mode).toLowerCase().includes(query))
    )
  }

  return modes
})

const getModeFullDescription = (mode: GameMode): string => {
  const descriptions: Record<string, string> = {
    // Core Modes
    classic: "The timeless foundation of strategic thinking. No pressure, no limits, just pure tactical excellence. Take your time to craft the perfect move and outmaneuver your opponents through careful planning.",
    speed: "Fast-paced tactical combat where every second counts. Quick thinking and rapid decision-making separate the masters from the apprentices. Can you maintain strategic depth under pressure?",
    blitz: "Lightning-fast gameplay for the ultimate adrenaline rush. Blink and you miss your chance. Only the most agile minds can thrive in this ultra-competitive environment.",
    marathon: "Epic sessions that can span hours or days. Save your progress and return when ready. Perfect for deep strategic campaigns and complex multi-player tournaments.",

    // Special Rules Modes
    gravity: "Physics meets strategy as pieces obey the laws of gravity. Plan your moves considering not just placement, but how pieces will fall and stack. A vertical dimension to classic tactics.",
    kingofthehill: "Territorial dominance through central control. Claim and defend the heart of the battlefield. Victory comes not just from alignment, but from strategic positioning and area control.",
    territory: "Expansionist warfare where land acquisition determines victory. Every move expands your domain. Control the most territory when the dust settles to claim supremacy.",
    chainreaction: "Explosive gameplay where every move can trigger cascading effects. Adjacent pieces amplify each other's power. Master the art of chain reactions for devastating combinations.",
    surrounded: "Tactical siege warfare where isolation leads to elimination. Surround your opponent's pieces to make them vanish. A game of encirclement and tactical maneuvering.",
    emptytrigger: "Mysterious void magic allows empty spaces to become weapons. Click an empty cell to eliminate surrounding pieces. Strategic placement meets magical destruction.",
    collapse: "The battlefield itself becomes your enemy as edges close in over time. Adapt to shrinking space while maintaining tactical advantage. Claustrophobic strategy at its finest.",
    mirror: "Reality bends as moves reflect across dimensional barriers. Every action has a mirrored consequence. Think in symmetry and master the art of parallel strategy.",
    decay: "Temporal magic causes pieces to fade from existence over time. Nothing is permanent in this ethereal realm. Plan for impermanence and embrace the flow of time.",

    // Multiplayer Modes
    team: "Unite forces in 2v2 strategic combat. Coordinate with your partner to achieve victory through teamwork. Share symbols and strategies while maintaining perfect synchronization.",
    elimination: "Last player standing wins in this battle royale of minds. Opponents are eliminated one by one until only the strongest strategist remains. Survival of the smartest.",
    roundrobin: "Tournament-style competition where every player faces every other player. Accumulate wins across multiple rounds to become the ultimate champion.",
    relay: "Teams alternate turns in rapid succession. When one teammate's time expires, the other takes over instantly. Perfect coordination and trust are essential.",

    // Board Variations
    hexagonal: "Six-directional movement on honeycomb grids opens up entirely new strategic possibilities. Traditional patterns don't work here - adapt or perish.",
    "3d": "Multi-layered boards create vertical strategy dimensions. Think in three dimensions as pieces can be placed on different levels with complex interaction rules.",
    wraparound: "The board edges connect like a donut topology. Pieces placed on one edge appear on the opposite side, creating mind-bending strategic opportunities.",
    obstacle: "Pre-placed blocking pieces create a tactical puzzle. Navigate around immovable barriers while seeking victory through constrained pathways.",
    void: "Random cells disappear during gameplay, creating dynamic terrain. Adapt to ever-changing battlefield conditions in this chaos-driven variant.",
    blackhole: "Overloaded board areas collapse into themselves, removing entire sections. Avoid creating dangerous concentrations that could destroy your strategy.",

    // Power-up Modes
    powerpieces: "Special symbols with unique abilities transform standard gameplay. Each power piece has distinct effects that can dramatically alter the game flow.",
    bomb: "Explosive pieces destroy surrounding areas when triggered. Create devastating clearing effects or protect key positions from explosive threats.",
    shield: "Protective pieces defend against removal effects and special abilities. Build defensive formations while planning offensive strikes.",
    swap: "Exchange positions with any piece on the board. Teleportation tactics create unprecedented strategic mobility and surprise attacks.",
    wildcard: "Random power-ups appear during play, adding unpredictable elements. Adapt quickly to new abilities and capitalize on unexpected opportunities."
  }
  return descriptions[mode.id] || mode.description
}

const getModeLore = (mode: GameMode): string => {
  const lore: Record<string, string> = {
    // Core Modes
    classic: "In the ancient halls of the Strategy Academy, masters would spend months perfecting a single game. Legend tells of the Grand Master who once contemplated a move for seven days before achieving perfect victory.",
    speed: "Born from the Lightning Tournaments of the Eastern Provinces, where monks sought to achieve enlightenment through rapid decision-making. The fastest hands were said to channel pure thought itself.",
    blitz: "Created by the Time Weavers of the Crystal Peaks, who compressed entire battles into heartbeats. Warriors trained in temporal acceleration chambers to master this lightning art.",
    marathon: "Conceived during the Great Patience Wars, where generals would plan campaigns across seasons. The longest recorded game lasted three years and changed the course of history.",

    // Special Rules Modes
    gravity: "Discovered by the Tower Builders of Vertigo City, who played their games on massive vertical boards. Gravity became their ally, turning simple placement into an art of physics and foresight.",
    kingofthehill: "Inspired by the Battle of the Golden Throne, where five kingdoms fought for control of a mystical central plaza. The kingdom that held the center longest was blessed with eternal prosperity.",
    territory: "Origins trace to the Mapmaker's Guild, who turned their territorial disputes into strategic games. Each victory expanded their influence over uncharted lands.",
    chainreaction: "Developed by the Alchemists of Chain Valley, who discovered that certain magical crystals could amplify each other's power. Their explosive experiments led to this dynamic combat system.",
    surrounded: "Tactics from the Great Siege of Isolation Fortress, where armies learned that complete encirclement was more powerful than direct assault. The fortress fell not to force, but to perfect positioning.",
    emptytrigger: "Ancient void magic discovered in the Null Ruins, where empty spaces held more power than occupied ones. Scholars learned to weaponize nothingness itself.",
    collapse: "Born from the Crumbling Citadel incident, where the battlefield itself began to shrink during a legendary duel. The survivors created this mode to honor those who adapted to chaos.",
    mirror: "From the Mirror Realm expeditions, where reality reflected infinitely. Explorers had to think in perfect symmetry or risk losing themselves in endless reflections.",
    decay: "Teachings of the Temporal Monks, who meditated on impermanence. They discovered that embracing transience led to deeper strategic understanding.",

    // Multiplayer Modes
    team: "Forged in the Alliance Wars, where rival nations learned that cooperation could achieve what individual brilliance could not. The greatest partnerships became legendary.",
    elimination: "Born from the Gladiator Academies of the Iron Coast, where only the most cunning strategists survived the brutal tournament brackets that determined royal advisors.",
    roundrobin: "Created by the Fair Judge's Council to ensure no victory was earned through luck alone. Every challenger must prove themselves against all others.",
    relay: "Invented by the Twin Generals of the Northern Campaign, who shared command so seamlessly that enemies never knew which mind they were truly facing.",

    // Board Variations
    hexagonal: "Discovered by the Hive Builders, an ancient civilization that learned sacred geometry from observing crystal formations and bee colonies in mystical forests.",
    "3d": "Developed by the Sky Cities architects, who built their strategies across multiple floating platforms connected by bridges of pure thought and determination.",
    wraparound: "Taught by the Sphere Walkers, nomadic mathematicians who proved that all boundaries are illusions and that true mastery comes from thinking beyond edges.",
    obstacle: "Created in the Maze Gardens of the Puzzle King, where court strategists navigated through ever-changing hedge layouts to earn their wisdom.",
    void: "Born from the Chaos Storms of the Shifting Sands, where reality itself was unreliable and only the most adaptable minds could find patterns in madness.",
    blackhole: "Originated from the Star Watchers, who observed cosmic phenomena and realized that sometimes destruction creates the space needed for new possibilities.",

    // Power-up Modes
    powerpieces: "Gifted by the Artifact Collectors, who discovered that certain ancient symbols retained the magical properties of their original creators across the ages.",
    bomb: "Developed by the Siege Engineers Guild, who learned that sometimes clearing the field completely was the only path to true strategic advancement.",
    shield: "Created by the Defender's Order, warrior-philosophers who proved that protection and patience could overcome any aggressive strategy when properly applied.",
    swap: "Mastered by the Teleportation Mages, who understood that the greatest power was not in placing pieces, but in moving them beyond ordinary limits.",
    wildcard: "Blessed by the Fortune Dancers, mystical performers who believed that embracing unpredictability was the highest form of strategic enlightenment."
  }
  return lore[mode.id] || ''
}

const getModeAbilities = (mode: GameMode): string[] => {
  const abilities: Record<string, string[]> = {
    // Core Modes
    classic: ["Unlimited thinking time", "Pure strategy focus", "No special rules or distractions"],
    speed: ["Configurable time limits", "Pressure-based scoring", "Quick-play sessions"],
    blitz: ["Ultra-fast time limits", "Adrenaline rush gameplay", "Reflex-based decisions"],
    marathon: ["Save and resume functionality", "Extended session support", "Deep campaign modes"],

    // Special Rules Modes
    gravity: ["Pieces fall after placement", "Vertical stacking mechanics", "Physics-based strategy"],
    kingofthehill: ["Central territory control", "Area-based victory conditions", "Defensive positioning rewards"],
    territory: ["Land acquisition scoring", "Expansion-based victory", "Geographic control"],
    chainreaction: ["Adjacent piece amplification", "Combo multipliers", "Cascading effects"],
    surrounded: ["Automatic piece elimination", "Siege warfare tactics", "Encirclement strategies"],
    emptytrigger: ["Empty cell activation", "Area-of-effect removal", "Void magic mechanics"],
    collapse: ["Shrinking battlefield", "Adaptive space management", "Pressure tactics"],
    mirror: ["Symmetrical move reflection", "Parallel strategy requirements", "Dimensional thinking"],
    decay: ["Time-based piece removal", "Impermanence mechanics", "Temporal strategy"],

    // Multiplayer Modes
    team: ["2v2 cooperative gameplay", "Shared symbol coordination", "Partnership strategy"],
    elimination: ["Last player standing", "Progressive player removal", "Survival mechanics"],
    roundrobin: ["Tournament bracket system", "Multiple round scoring", "Fair competition format"],
    relay: ["Alternating team control", "Seamless player transitions", "Coordinated time management"],

    // Board Variations
    hexagonal: ["Six-directional movement", "Honeycomb grid patterns", "New geometric strategies"],
    "3d": ["Multi-layer board system", "Vertical piece interactions", "Three-dimensional thinking"],
    wraparound: ["Edge-to-edge connectivity", "Topology-based movement", "Borderless strategy"],
    obstacle: ["Pre-placed blocking pieces", "Navigation puzzles", "Constrained movement"],
    void: ["Random cell disappearance", "Dynamic terrain changes", "Adaptive positioning"],
    blackhole: ["Area collapse mechanics", "Overload destruction", "Spatial management"],

    // Power-up Modes
    powerpieces: ["Special ability symbols", "Enhanced piece effects", "Dynamic power system"],
    bomb: ["Explosive area clearing", "Destructive capabilities", "Tactical demolition"],
    shield: ["Defensive protection", "Removal immunity", "Defensive formations"],
    swap: ["Position exchange abilities", "Teleportation mechanics", "Mobility enhancement"],
    wildcard: ["Random power appearances", "Unpredictable effects", "Adaptive gameplay"]
  }
  return abilities[mode.id] || []
}

const getModeStrategy = (mode: GameMode): string => {
  const strategies: Record<string, string> = {
    // Core Modes
    classic: "Focus on long-term positioning and pattern recognition. Study your opponent's tendencies and build towards multiple win conditions simultaneously.",
    speed: "Develop muscle memory for common patterns. Practice quick threat assessment and always have a backup plan ready before your turn begins.",
    blitz: "Master essential opening patterns and endings. In blitz, intuition matters more than calculation - trust your strategic instincts.",
    marathon: "Plan in phases and adapt your strategy as the game evolves. Use save points strategically to analyze complex positions.",

    // Special Rules Modes
    gravity: "Think vertically and plan for piece interactions. Use gravity to create unexpected winning positions by stacking strategically.",
    kingofthehill: "Balance offense with defense. Control the center early but be ready to sacrifice edge pieces to maintain central dominance.",
    territory: "Expand efficiently while denying opponent expansion. Focus on controlling key territorial chokepoints and building connected regions.",
    chainreaction: "Identify chain opportunities before your opponent. Set up multiple small chains that can combine into devastating combinations.",
    surrounded: "Create multiple threats simultaneously. Force your opponent to choose which pieces to save, then exploit their difficult decisions.",
    emptytrigger: "Control key empty spaces and use them as weapons. Position pieces to maximize the destructive potential of void activations.",
    collapse: "Adapt to shrinking space by maintaining central positions. Force opponents toward edges that will soon disappear.",
    mirror: "Think in perfect symmetry and use reflection to your advantage. Every move creates two opportunities - master both sides.",
    decay: "Plan for piece lifespans and manage temporal resources. Create overlapping threats that persist even as pieces fade.",

    // Multiplayer Modes
    team: "Communicate efficiently with your partner and coordinate symbol placement. Develop shared strategies and cover each other's weaknesses.",
    elimination: "Play defensively early and strike decisively late. Form temporary alliances but be ready to break them when advantageous.",
    roundrobin: "Pace yourself across multiple games and adapt strategies for different opponents. Consistency beats brilliance in tournaments.",
    relay: "Develop seamless handoff techniques with your teammate. Create positions that are clear for your partner to continue.",

    // Board Variations
    hexagonal: "Learn new geometric patterns and six-way threat detection. Traditional corner strategies don't apply - think in triangles.",
    "3d": "Master vertical layer interactions and three-dimensional threat patterns. Control key connective nodes between levels.",
    wraparound: "Use edge connections to create surprise attacks. Think globally - your pieces can appear anywhere on the opposite side.",
    obstacle: "Navigate efficiently around barriers and use obstacles to block opponent strategies. Turn limitations into defensive advantages.",
    void: "Stay flexible and adapt to terrain changes. Avoid over-committing to areas that might disappear unexpectedly.",
    blackhole: "Monitor piece concentrations carefully and avoid triggering collapses. Use the threat of destruction to control opponent movement.",

    // Power-up Modes
    powerpieces: "Learn each special ability thoroughly and combine effects creatively. Save powerful pieces for crucial moments.",
    bomb: "Use explosive threats to control territory and clear problematic areas. Time detonations for maximum strategic impact.",
    shield: "Build protected strongholds and use shields to preserve key positions. Balance defensive and offensive shield placement.",
    swap: "Master teleportation timing and use position exchanges to create instant threats. Confuse opponents with unexpected movements.",
    wildcard: "Stay adaptable and capitalize quickly on random opportunities. Build flexible positions that benefit from any power-up."
  }
  return strategies[mode.id] || ''
}

const getPlayerCount = (mode: GameMode): string => {
  const playerCounts: Record<string, string> = {
    // Core Modes
    classic: "2-4 players",
    speed: "2-4 players",
    blitz: "2-4 players",
    marathon: "2-4 players",

    // Special Rules Modes
    gravity: "2-4 players",
    kingofthehill: "2-4 players",
    territory: "2-4 players",
    chainreaction: "2-4 players",
    surrounded: "2-4 players",
    emptytrigger: "2-4 players",
    collapse: "2-4 players",
    mirror: "2 players",
    decay: "2-4 players",

    // Multiplayer Modes
    team: "4 players (2v2)",
    elimination: "3-8 players",
    roundrobin: "3-8 players",
    relay: "4-8 players",

    // Board Variations
    hexagonal: "2-6 players",
    "3d": "2-4 players",
    wraparound: "2-4 players",
    obstacle: "2-4 players",
    void: "2-4 players",
    blackhole: "2-4 players",

    // Power-up Modes
    powerpieces: "2-4 players",
    bomb: "2-4 players",
    shield: "2-4 players",
    swap: "2-4 players",
    wildcard: "2-4 players"
  }
  return playerCounts[mode.id] || "2-4 players"
}

const getDifficulty = (mode: GameMode): string => {
  const difficulties: Record<string, string> = {
    // Core Modes
    classic: "Beginner",
    speed: "Intermediate",
    blitz: "Expert",
    marathon: "Advanced",

    // Special Rules Modes
    gravity: "Intermediate",
    kingofthehill: "Advanced",
    territory: "Advanced",
    chainreaction: "Expert",
    surrounded: "Advanced",
    emptytrigger: "Expert",
    collapse: "Advanced",
    mirror: "Expert",
    decay: "Expert",

    // Multiplayer Modes
    team: "Intermediate",
    elimination: "Advanced",
    roundrobin: "Advanced",
    relay: "Expert",

    // Board Variations
    hexagonal: "Advanced",
    "3d": "Expert",
    wraparound: "Advanced",
    obstacle: "Intermediate",
    void: "Expert",
    blackhole: "Expert",

    // Power-up Modes
    powerpieces: "Advanced",
    bomb: "Advanced",
    shield: "Intermediate",
    swap: "Expert",
    wildcard: "Expert"
  }
  return difficulties[mode.id] || "Intermediate"
}

const selectMode = (mode: GameMode) => {
  emit('modeSelected', mode)
}
</script>

<style scoped>
.catalog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.catalog-container {
  background: linear-gradient(135deg,
    rgba(25, 25, 25, 0.95) 0%,
    rgba(45, 35, 25, 0.9) 25%,
    rgba(65, 45, 35, 0.85) 50%,
    rgba(85, 65, 45, 0.9) 75%,
    rgba(105, 85, 65, 0.95) 100%
  );
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(139, 69, 19, 0.6);
  width: 95vw;
  max-width: 1200px;
  height: 90vh;
  max-height: 800px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  border-bottom: 2px solid rgba(139, 69, 19, 0.3);
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.3), rgba(160, 82, 45, 0.2));
}

.header-content {
  flex: 1;
}

.catalog-title {
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(90deg, #ffd700, #ffed4e, #fff5b3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.catalog-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  font-style: italic;
}

.close-btn {
  background: rgba(255, 69, 69, 0.2);
  border: 2px solid rgba(255, 69, 69, 0.4);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  color: #ff4545;
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 69, 69, 0.3);
  transform: scale(1.1);
}

.catalog-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.search-section {
  margin-bottom: 2rem;
}

.search-bar {
  position: relative;
  margin-bottom: 1rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.6);
}

.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(139, 69, 19, 0.4);
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: rgba(255, 215, 0, 0.6);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 0.6rem 1.2rem;
  background: rgba(139, 69, 19, 0.3);
  border: 2px solid rgba(139, 69, 19, 0.5);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-tab:hover {
  background: rgba(139, 69, 19, 0.5);
  color: white;
}

.filter-tab.active {
  background: rgba(255, 215, 0, 0.2);
  border-color: rgba(255, 215, 0, 0.6);
  color: #ffd700;
}

.modes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.mode-catalog-card {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(139, 69, 19, 0.2));
  border: 2px solid rgba(139, 69, 19, 0.4);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}

.mode-catalog-card:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 215, 0, 0.6);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.mode-catalog-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mode-catalog-card.disabled:hover {
  transform: none;
  border-color: rgba(139, 69, 19, 0.4);
  box-shadow: none;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.mode-icon-large {
  font-size: 3rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.mode-title-section {
  flex: 1;
}

.mode-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #ffd700;
  margin: 0 0 0.5rem 0;
}

.mode-category {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 69, 69, 0.2);
  border: 1px solid rgba(255, 69, 69, 0.4);
  border-radius: 12px;
  font-size: 0.75rem;
  color: #ff6b6b;
  font-weight: 600;
}

.card-content {
  margin-bottom: 1rem;
}

.mode-description {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.mode-lore {
  background: rgba(139, 69, 19, 0.2);
  border-left: 4px solid rgba(255, 215, 0, 0.6);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.lore-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ffd700;
  margin: 0 0 0.5rem 0;
}

.lore-text {
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
  line-height: 1.5;
  margin: 0;
  font-size: 0.9rem;
}

.mode-abilities {
  margin-bottom: 1rem;
}

.abilities-title {
  font-size: 1rem;
  font-weight: 600;
  color: #4ecdc4;
  margin: 0 0 0.5rem 0;
}

.abilities-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ability-item {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  padding: 0.25rem 0;
  position: relative;
  padding-left: 1.5rem;
}

.ability-item::before {
  content: '⚡';
  position: absolute;
  left: 0;
  top: 0.25rem;
  color: #4ecdc4;
}

.mode-strategy {
  background: rgba(78, 205, 196, 0.1);
  border-left: 4px solid rgba(78, 205, 196, 0.6);
  padding: 1rem;
  border-radius: 8px;
}

.strategy-title {
  font-size: 1rem;
  font-weight: 600;
  color: #4ecdc4;
  margin: 0 0 0.5rem 0;
}

.strategy-text {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  margin: 0;
  font-size: 0.9rem;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(139, 69, 19, 0.3);
}

.mode-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.select-mode-btn {
  padding: 0.6rem 1.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 20px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.select-mode-btn:hover {
  background: linear-gradient(135deg, #5a6fd8, #6a4190);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

/* Scrollbar styling */
.catalog-content::-webkit-scrollbar {
  width: 8px;
}

.catalog-content::-webkit-scrollbar-track {
  background: rgba(139, 69, 19, 0.2);
  border-radius: 10px;
}

.catalog-content::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.6), rgba(139, 69, 19, 0.6));
  border-radius: 10px;
}

.catalog-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.8), rgba(139, 69, 19, 0.8));
}
</style>