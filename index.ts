import { RoleAssignmentData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseMod } from "@polusgg/plugin-polusgg-api/src/baseMod/baseMod";
import { PluginMetadata } from "@nodepolus/framework/src/api/plugin";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { Jester, JesterManager } from "./src/roles/jester";
import { Sheriff, SheriffManager } from "./src/roles/sheriff";
import { Snitch, SnitchManager } from "./src/roles/snitch";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { Engineer, EngineerManager } from "./src/roles/engineer";
import { Grenadier, GrenadierManager } from "./src/roles/grenadier";
import { Oracle, OracleManager } from "./src/roles/oracle";
import { Phantom, PhantomManager } from "./src/roles/phantom";
import { SerialKiller, SerialKillerManager } from "./src/roles/serialKiller";
import { BooleanValue, EnumValue, NumberValue } from "@polusgg/plugin-polusgg-api/src/packets/root/setGameOption";
import { BaseRole, RoleAlignment } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { TownOfPolusGameOptionCategories, TownOfPolusGameOptionNames } from "./src/types";
import { GameOptionPriority } from "@polusgg/plugin-polusgg-api/src/services/gameOptions/gameOptionsSet";
import { Locksmith, LocksmithManager } from "./src/roles/locksmith";
import { LobbyDefaultOptions, vanillaGameOptions } from "@polusgg/plugin-polusgg-api/src/services/gameOptions/gameOptionsService";
import { GameOption } from "@polusgg/plugin-polusgg-api/src/services/gameOptions/gameOption";
import { EmojiService } from "@polusgg/plugin-polusgg-api/src/services/emojiService/emojiService";
import { Swooper, SwooperManager } from "./src/roles/swooper";
import { Poisoner, PoisonerManager } from "./src/roles/poisoner";
import { Morphling, MorphlingManager } from "./src/roles/morphling";
import { CrewmateManager } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { ImpostorManager } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { Impervious, ImperviousManager } from "./src/roles/impervious";

export type TownOfPolusGameOptions = {
  /* Engineer */
  [TownOfPolusGameOptionNames.EngineerProbability]: NumberValue;

  /* Grenadier */
  [TownOfPolusGameOptionNames.GrenadierProbability]: NumberValue;
  [TownOfPolusGameOptionNames.GrenadierCooldown]: NumberValue;
  // [TownOfPolusGameOptionNames.GrenadierRange]: NumberValue;
  [TownOfPolusGameOptionNames.GrenadierBlindness]: NumberValue;

  /* Jester */
  [TownOfPolusGameOptionNames.JesterProbability]: NumberValue;

  /* Morphling */
  [TownOfPolusGameOptionNames.MorphlingProbability]: NumberValue;
  [TownOfPolusGameOptionNames.MorphlingCooldown]: NumberValue;
  [TownOfPolusGameOptionNames.MorphlingDuration]: NumberValue;

  /* Oracle */
  [TownOfPolusGameOptionNames.OracleProbability]: NumberValue;
  [TownOfPolusGameOptionNames.OracleCooldown]: NumberValue;
  [TownOfPolusGameOptionNames.OracleAccuracy]: NumberValue;

  /* Phantom */
  [TownOfPolusGameOptionNames.PhantomProbability]: NumberValue;
  [TownOfPolusGameOptionNames.PhantomRemainingTasks]: NumberValue;
  [TownOfPolusGameOptionNames.PhantomAppearTime]: NumberValue;
  [TownOfPolusGameOptionNames.PhantomRevealTime]: EnumValue;

  /* Serial Killer */
  [TownOfPolusGameOptionNames.SerialKillerProbability]: NumberValue;
  [TownOfPolusGameOptionNames.SerialKillerCooldown]: NumberValue;
  [TownOfPolusGameOptionNames.SerialKillerMinPlayers]: NumberValue;

  /* Sheriff */
  [TownOfPolusGameOptionNames.SheriffProbability]: NumberValue;
  [TownOfPolusGameOptionNames.SheriffCooldown]: NumberValue;

  /* Snitch */
  [TownOfPolusGameOptionNames.SnitchProbability]: NumberValue;
  [TownOfPolusGameOptionNames.SnitchRemainingTasks]: NumberValue;

  /* Locksmith */
  [TownOfPolusGameOptionNames.LocksmithProbability]: NumberValue;
  [TownOfPolusGameOptionNames.LocksmithCooldown]: NumberValue;
  [TownOfPolusGameOptionNames.LocksmithUses]: NumberValue;
  [TownOfPolusGameOptionNames.LocksmithRange]: EnumValue;

  /* Swooper */
  [TownOfPolusGameOptionNames.SwooperProbability]: NumberValue;
  [TownOfPolusGameOptionNames.SwooperCooldown]: NumberValue;
  [TownOfPolusGameOptionNames.SwooperAbilityDuration]: NumberValue;

  /* Poisoner */
  [TownOfPolusGameOptionNames.PoisonerProbability]: NumberValue;
  [TownOfPolusGameOptionNames.PoisonerCooldown]: NumberValue;
  [TownOfPolusGameOptionNames.PoisonerRange]: EnumValue;
  // [TownOfPolusGameOptionNames.PoisonerTargets]: BooleanValue;
  [TownOfPolusGameOptionNames.PoisonerPoisonDuration]: NumberValue;

  /* Impervious */
  [TownOfPolusGameOptionNames.ImperviousProbability]: NumberValue;
  [TownOfPolusGameOptionNames.ImperviousCooldown]: NumberValue;
};

const pluginMetadata: PluginMetadata = {
  name: "Town Of Polus",
  version: [1, 0, 0],
  authors: [
    {
      name: "Polus.gg",
      email: "contact@polus.gg",
      website: "https://polus.gg",
    },
  ],
  description: "NodePolus plugin generated from the template repository",
  website: "https://polus.gg",
};

const roleEmojis = new Map([
  [CrewmateManager, EmojiService.static("crewmate")],
  [ImpostorManager, EmojiService.static("impostor")],
  [EngineerManager, EmojiService.static("engineer")],
  [GrenadierManager, EmojiService.static("grenadier")],
  [JesterManager, EmojiService.static("jester")],
  [LocksmithManager, EmojiService.static("locksmith")],
  [OracleManager, EmojiService.static("oracle")],
  [PhantomManager, EmojiService.static("phantom")],
  [SerialKillerManager, EmojiService.static("serialkiller")],
  [SheriffManager, EmojiService.static("sheriff")],
  [SnitchManager, EmojiService.static("snitch")],
  [SwooperManager, EmojiService.static("swooper")],
  [MorphlingManager, EmojiService.static("morphling")],
  [ImperviousManager, EmojiService.static("impervious")],
  [PoisonerManager, EmojiService.static("poisoner")],
]);

const alignmentEmojis = new Map([
  [RoleAlignment.Crewmate, EmojiService.static("crewalign")],
  [RoleAlignment.Impostor, EmojiService.static("impoalign")],
  [RoleAlignment.Neutral, EmojiService.static("neutalign")],
  [RoleAlignment.Other, EmojiService.static("neutalign")],
]);

export function getSpriteForRole(role: BaseRole): string {
  return roleEmojis.get(role.getManagerType()) ?? "";
}

export function getAlignmentSpriteForRole(role: BaseRole): string {
  return alignmentEmojis.get(role.getAlignment()) ?? "";
}

export function resolveOptionPercent(percent: number): number {
  // example input: 230%
  // split the 230% into 2 + (30%)
  // floor p/100 = 2
  // (mod p, 100) / 100 to get 0.3
  // if Math.random <= 0.3 = 1 : 0
  return Math.floor(percent / 100) + (Math.random() < ((percent % 100) / 100) ? 1 : 0);
}

export default class extends BaseMod {
  protected handlingTaskCount: Map<LobbyInstance, boolean> = new Map();
  protected taskCountShouldRecurse: Map<LobbyInstance, boolean> = new Map();
  protected handlingLevelUpdate: Map<LobbyInstance, boolean> = new Map();
  protected levelUpdateShouldRecurse: Map<LobbyInstance, boolean> = new Map();

  constructor() {
    super(pluginMetadata);

    AssetBundle.load("TownOfPolus/TownOfPolus").then(_ => {
      this.getLogger().info("Loaded TownOfPolus AssetBundle");
    });

    // this.server.on("player.joined", _ => {
    //   Services.get(ServiceType.Hud).displayNotification("Warning: This server is running an unstable version of TownOfPolus.\nPlease do not report issues");
    // });

    // todo set task strings for all impostor and neutral types

    Services.get(ServiceType.EndGame).on("beforeGameEnd", async game => {
      const players = game.getLobby().getPlayers();

      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const role = player.getMeta<BaseRole>("pgg.api.role");

        if (role instanceof Morphling) {
          delete role.timeout;
          await role.ownAppearance!.apply(role.owner);
        }
      }
    });
  }

  getRoles(lobby: LobbyInstance): RoleAssignmentData[] {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(lobby);

    return [
      {
        role: Engineer,
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.EngineerProbability).getValue().value),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Grenadier,
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.GrenadierProbability).getValue().value),
        assignWith: RoleAlignment.Impostor,
      }, {
        role: Swooper,
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.SwooperProbability).getValue().value),
        assignWith: RoleAlignment.Impostor,
      }, {
        role: Poisoner,
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.PoisonerProbability).getValue().value),
        assignWith: RoleAlignment.Impostor,
      }, {
        role: Jester,
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.JesterProbability).getValue().value),
        assignWith: RoleAlignment.Neutral,
      }, {
        role: Morphling,
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.MorphlingProbability).getValue().value),
        assignWith: RoleAlignment.Impostor,
      }, {
        role: Oracle,
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.OracleProbability).getValue().value),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Phantom,
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.PhantomProbability).getValue().value),
        assignWith: RoleAlignment.Neutral,
      }, {
        role: SerialKiller,
        playerCount: gameOptions.getOption(TownOfPolusGameOptionNames.SerialKillerMinPlayers).getValue().value <= lobby.getPlayers().length ? resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.SerialKillerProbability).getValue().value) : 0,
        assignWith: RoleAlignment.Neutral,
      }, {
        role: Sheriff,
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.SheriffProbability).getValue().value),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Snitch,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.SnitchProbability)?.getValue()?.value ?? 0),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Locksmith,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.LocksmithProbability)?.getValue()?.value ?? 0),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Impervious,
        playerCount: resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.ImperviousProbability).getValue().value),
        assignWith: RoleAlignment.Crewmate,
      },
    ];
  }

  async onEnable(lobby: LobbyInstance): Promise<void> {
    await super.onEnable(lobby);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions & LobbyDefaultOptions>(lobby);

    gameOptions.on("option.Map.changed", this.handleLevelUpdate.bind(this));

    gameOptions.on("option.Long Tasks.changed", this.handleTaskCountUpdate.bind(this));
    gameOptions.on("option.Short Tasks.changed", this.handleTaskCountUpdate.bind(this));
    gameOptions.on("option.Common Tasks.changed", this.handleTaskCountUpdate.bind(this));

    await Promise.all([
      //Crewmate Role Probability
      gameOptions.createOption(TownOfPolusGameOptionCategories.CrewmateRoles, TownOfPolusGameOptionNames.EngineerProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher),
      gameOptions.createOption(TownOfPolusGameOptionCategories.CrewmateRoles, TownOfPolusGameOptionNames.ImperviousProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 1),
      gameOptions.createOption(TownOfPolusGameOptionCategories.CrewmateRoles, TownOfPolusGameOptionNames.LocksmithProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 2),
      gameOptions.createOption(TownOfPolusGameOptionCategories.CrewmateRoles, TownOfPolusGameOptionNames.OracleProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 3),
      gameOptions.createOption(TownOfPolusGameOptionCategories.CrewmateRoles, TownOfPolusGameOptionNames.SheriffProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 4),
      gameOptions.createOption(TownOfPolusGameOptionCategories.CrewmateRoles, TownOfPolusGameOptionNames.SnitchProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 5),

      //Neutral Role Probability
      gameOptions.createOption(TownOfPolusGameOptionCategories.NeutralRoles, TownOfPolusGameOptionNames.JesterProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 10),
      gameOptions.createOption(TownOfPolusGameOptionCategories.NeutralRoles, TownOfPolusGameOptionNames.PhantomProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 11),
      gameOptions.createOption(TownOfPolusGameOptionCategories.NeutralRoles, TownOfPolusGameOptionNames.SerialKillerProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 12),

      //Impostor Role Probability
      gameOptions.createOption(TownOfPolusGameOptionCategories.ImpostorRoles, TownOfPolusGameOptionNames.GrenadierProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 20),
      gameOptions.createOption(TownOfPolusGameOptionCategories.ImpostorRoles, TownOfPolusGameOptionNames.MorphlingProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 21),
      gameOptions.createOption(TownOfPolusGameOptionCategories.ImpostorRoles, TownOfPolusGameOptionNames.PoisonerProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 22),
      gameOptions.createOption(TownOfPolusGameOptionCategories.ImpostorRoles, TownOfPolusGameOptionNames.SwooperProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Higher + 23),

      //Crewmate Role Options
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.ImperviousCooldown, new NumberValue(10, 2.5, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 30),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.LocksmithCooldown, new NumberValue(10, 2.5, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 31),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.LocksmithUses, new NumberValue(2, 1, 1, 10, false, "{0} uses"), GameOptionPriority.Normal + 32),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.LocksmithRange, new EnumValue(1, ["Short", "Normal", "Long"]), GameOptionPriority.Normal + 33),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.OracleCooldown, new NumberValue(10, 2.5, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 34),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.OracleAccuracy, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 35),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SheriffCooldown, new NumberValue(10, 2.5, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 36),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SnitchRemainingTasks, new NumberValue(2, 1, 1, 6, false, "{0} tasks"), GameOptionPriority.Normal + 37),

      //Neutral Role Options
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomRemainingTasks, new NumberValue(2, 1, 1, 6, false, "{0} tasks"), GameOptionPriority.Normal + 50),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomAppearTime, new NumberValue(10, 5, 0, 60, false, "{0}s"), GameOptionPriority.Normal + 51),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomRevealTime, new EnumValue(0, ["Immediately", "After Meeting"]), GameOptionPriority.Normal + 52),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SerialKillerCooldown, new NumberValue(10, 2.5, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 53),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SerialKillerMinPlayers, new NumberValue(6, 1, 4, 15, false, "{0} players"), GameOptionPriority.Normal + 54),

      //Impostor Role Options
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierCooldown, new NumberValue(10, 2.5, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 70),
      // gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierRange, new NumberValue(4, 0.5, 0.5, 10, false, "{0} units"), GameOptionPriority.Normal + 71),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierBlindness, new NumberValue(5, 0.5, 0.5, 15, false, "{0}s"), GameOptionPriority.Normal + 72),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.MorphlingCooldown, new NumberValue(10, 2.5, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 73),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.MorphlingDuration, new NumberValue(10, 1, 5, 30, false, "{0}s"), GameOptionPriority.Normal + 74),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PoisonerCooldown, new NumberValue(10, 2.5, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 75),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PoisonerPoisonDuration, new NumberValue(15, 5, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 76),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PoisonerRange, new EnumValue(1, ["Really Short", "Short", "Normal", "Long"]), GameOptionPriority.Normal + 77),
      // gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PoisonerTargets, new BooleanValue(false), GameOptionPriority.Normal + 78),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SwooperCooldown, new NumberValue(10, 2.5, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 79),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SwooperAbilityDuration, new NumberValue(10, 1, 5, 30, false, "{0}s"), GameOptionPriority.Normal + 80),

    ] as any[]);

    setTimeout(() => {
      this.handleTaskCountUpdate({ getLobby() { return lobby } });
      this.handleLevelUpdate(gameOptions.getOption("Map"));
    }, 250);
  }

  async onDisable(lobby: LobbyInstance): Promise<void> {
    super.onDisable(lobby);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions(lobby);

    await Promise.all(
      Object.keys(gameOptions.getAllOptions())
        .filter(option => !vanillaGameOptions.has(option) && option !== "Gamemode")
        .map(async option => await gameOptions.deleteOption(option)),
    );
  }

  private async handleTaskCountUpdate(opt: { getLobby(): LobbyInstance }): Promise<void> {
    if (!this.getEnabled(opt.getLobby())) {
      return;
    }

    if (this.handlingTaskCount.get(opt.getLobby())) {
      this.taskCountShouldRecurse.set(opt.getLobby(), true);

      return;
    }

    this.taskCountShouldRecurse.set(opt.getLobby(), false);
    this.handlingTaskCount.set(opt.getLobby(), true);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions & LobbyDefaultOptions & any>(opt.getLobby());

    try {
      const totalTaskCount = gameOptions.getOption("Long Tasks").getValue().value + gameOptions.getOption("Short Tasks").getValue().value + gameOptions.getOption("Common Tasks").getValue().value;

      if (totalTaskCount >= 3) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (gameOptions.getOption(TownOfPolusGameOptionNames.SnitchRemainingTasks) === undefined) {
          await Promise.all([
            gameOptions.createOption(TownOfPolusGameOptionCategories.CrewmateRoles, TownOfPolusGameOptionNames.SnitchProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 4),
            gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SnitchRemainingTasks, new NumberValue(2, 1, 0, 6, false, "{0} tasks"), GameOptionPriority.Normal + 18),
            gameOptions.deleteOption("<color=#00ffdd7f>Snitch</color> <alpha=#7f>Remaining Tasks"),
            gameOptions.deleteOption("<size=150%><sprite index=11></size> <color=#00ffdd>Snitch</color><alpha=#7f>"),
          ]);
        }

        const snitchTaskCount = gameOptions.getOption(TownOfPolusGameOptionNames.SnitchRemainingTasks);

        const nv = snitchTaskCount.getValue();

        nv.upper = totalTaskCount - 1;

        if (snitchTaskCount.getValue().value > totalTaskCount - 1) {
          nv.value = totalTaskCount - 1;
        }

        snitchTaskCount.setValue(nv);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (gameOptions.getOption(TownOfPolusGameOptionNames.SnitchRemainingTasks) !== undefined) {
        await Promise.all([
          gameOptions.deleteOption(TownOfPolusGameOptionNames.SnitchRemainingTasks),
          gameOptions.deleteOption(TownOfPolusGameOptionNames.SnitchProbability),
          gameOptions.createOption(TownOfPolusGameOptionCategories.Config, "<color=#00ffdd7f>Snitch</color> <alpha=#7f>Remaining Tasks", new EnumValue(0, ["Unavailable"]), GameOptionPriority.Normal + 18),
          gameOptions.createOption(TownOfPolusGameOptionCategories.CrewmateRoles, "<size=150%><sprite index=11> </size><color=#00ffdd>Snitch</color><alpha=#7f>", new EnumValue(0, ["Unavailable"]), GameOptionPriority.Normal + 4),
        ]);
      }
    } catch { }

    if (!this.getEnabled(opt.getLobby())) {
      await Promise.all([
        gameOptions.deleteOption("<color=#00ffdd7f>Snitch</color> <alpha=#7f>Remaining Tasks"),
        gameOptions.deleteOption("<size=150%><sprite index=11></size> <color=#00ffdd>Snitch</color><alpha=#7f>"),
        gameOptions.deleteOption(TownOfPolusGameOptionNames.SnitchRemainingTasks),
        gameOptions.deleteOption(TownOfPolusGameOptionNames.SnitchProbability),
      ]);
    }

    this.handlingTaskCount.set(opt.getLobby(), false);

    if (this.taskCountShouldRecurse.get(opt.getLobby())) {
      this.handleTaskCountUpdate(opt);
    }
  }

  private async handleLevelUpdate(newLevel: GameOption<NumberValue | EnumValue | BooleanValue>): Promise<void> {
    if (!this.getEnabled(newLevel.getLobby())) {
      return;
    }

    if (this.handlingLevelUpdate.get(newLevel.getLobby())) {
      this.levelUpdateShouldRecurse.set(newLevel.getLobby(), true);

      return;
    }

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions & LobbyDefaultOptions & any>(newLevel.getLobby());

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if ((newLevel.getValue() as EnumValue).index < 2 && gameOptions.getOption(TownOfPolusGameOptionNames.LocksmithProbability) !== undefined) {
      await Promise.all([
        gameOptions.deleteOption(TownOfPolusGameOptionNames.LocksmithProbability),
        gameOptions.deleteOption(TownOfPolusGameOptionNames.LocksmithCooldown),
        gameOptions.deleteOption(TownOfPolusGameOptionNames.LocksmithUses),
        gameOptions.deleteOption(TownOfPolusGameOptionNames.LocksmithRange),
        gameOptions.createOption(TownOfPolusGameOptionCategories.CrewmateRoles, `<size=150%><sprite index=14 color=#FFFFFF7f> </size><color=#3d85c67f>Locksmith</color><alpha=#7f>`, new EnumValue(0, ["Unavailable<alpha=#FF>"]), GameOptionPriority.Normal + 1),
        gameOptions.createOption(TownOfPolusGameOptionCategories.Config, `<color=#3d85c67f>Locksmith</color> <alpha=#7f>Cooldown`, new EnumValue(0, ["Unavailable<alpha=#FF>"]), GameOptionPriority.Normal + 12),
        gameOptions.createOption(TownOfPolusGameOptionCategories.Config, `<color=#3d85c67f>Locksmith</color> <alpha=#7f>Uses`, new EnumValue(0, ["Unavailable<alpha=#FF>"]), GameOptionPriority.Normal + 13),
        gameOptions.createOption(TownOfPolusGameOptionCategories.Config, `<color=#3d85c67f>Locksmith</color> <alpha=#7f>Range`, new EnumValue(0, ["Unavailable<alpha=#FF>"]), GameOptionPriority.Normal + 14),
      ]);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if ((newLevel.getValue() as EnumValue).index >= 2 && gameOptions.getOption(`<size=150%><sprite index=14 color=#FFFFFF7f> </size><color=#3d85c67f>Locksmith</color><alpha=#7f>`) !== undefined) {
      await Promise.all([
        gameOptions.deleteOption(`<size=150%><sprite index=14 color=#FFFFFF7f> </size><color=#3d85c67f>Locksmith</color><alpha=#7f>`),
        gameOptions.deleteOption(`<color=#3d85c67f>Locksmith</color> <alpha=#7f>Cooldown`),
        gameOptions.deleteOption(`<color=#3d85c67f>Locksmith</color> <alpha=#7f>Uses`),
        gameOptions.deleteOption(`<color=#3d85c67f>Locksmith</color> <alpha=#7f>Range`),
        gameOptions.createOption(TownOfPolusGameOptionCategories.CrewmateRoles, TownOfPolusGameOptionNames.LocksmithProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 1),
        gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.LocksmithCooldown, new NumberValue(1, 1, 1, 60, false, "{0}s"), GameOptionPriority.Normal + 12),
        gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.LocksmithUses, new NumberValue(2, 1, 1, 10, false, "{0} uses"), GameOptionPriority.Normal + 13),
        gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.LocksmithRange, new EnumValue(1, ["Short", "Normal", "Long"]), GameOptionPriority.Normal + 14),
      ]);
    }

    if (!this.getEnabled(newLevel.getLobby())) {
      await Promise.all([
        gameOptions.deleteOption(`<size=150%><sprite index=14 color=#FFFFFF7f> </size><color=#3d85c67f>Locksmith</color><alpha=#7f>`),
        gameOptions.deleteOption(`<color=#3d85c67f>Locksmith</color> <alpha=#7f>Cooldown`),
        gameOptions.deleteOption(`<color=#3d85c67f>Locksmith</color> <alpha=#7f>Uses`),
        gameOptions.deleteOption(`<color=#3d85c67f>Locksmith</color> <alpha=#7f>Range`),
        gameOptions.deleteOption(TownOfPolusGameOptionNames.LocksmithProbability),
        gameOptions.deleteOption(TownOfPolusGameOptionNames.LocksmithCooldown),
        gameOptions.deleteOption(TownOfPolusGameOptionNames.LocksmithUses),
        gameOptions.deleteOption(TownOfPolusGameOptionNames.LocksmithRange),
      ]);
    }

    this.handlingLevelUpdate.set(newLevel.getLobby(), false);

    if (this.levelUpdateShouldRecurse.get(newLevel.getLobby())) {
      this.handleLevelUpdate(gameOptions.getOption("Map"));
    }
  }
}
