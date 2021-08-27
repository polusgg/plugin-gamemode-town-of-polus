import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { GameState } from "@nodepolus/framework/src/types/enums";
import { Vector2 } from "@nodepolus/framework/src/types";
import { getSpriteForRole, TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";

const COLOR = `#2d7531`;

const IMPERVIOUS_DEAD_STRING = `<color=${COLOR}>Role: Impervious</color>
<color=#ff1919>You're dead, finish your tasks.</color>`;

export class ImperviousManager extends BaseManager {
  getId(): string { return "impervious" }
  getTypeName(): string { return "Impervious" }
}

export class Impervious extends Crewmate {
  public target: PlayerInstance | undefined = undefined;

  protected metadata: RoleMetadata = {
    name: "Impervious",
    alignment: RoleAlignment.Neutral,
    preventBaseEmoji: true,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${Services.get(ServiceType.Name).getFor(this.owner.getSafeConnection(), this.owner)}`);

    const connection = owner.getConnection();

    if (connection) {
      Services.get(ServiceType.Resource).load(connection, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")).then(this.ready.bind(this));
    } else {
      this.ready();
    }
  }

  async ready(): Promise<void> {
    const connection = this.owner.getConnection();
    const cooldown = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby()).getOption(TownOfPolusGameOptionNames.ImperviousCooldown).getValue().value;

    if (!connection) {
      return;
    }

    console.log(cooldown);

    const enchantButton = await Services.get(ServiceType.Button).spawnButton(connection, {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")
        .getSafeAsset("Assets/Mods/TownOfPolus/Enchant.png"),
      maxTimer: cooldown,
      position: new Vector2(-2.1, -0.7),
      alignment: EdgeAlignments.RightBottom,
      isCountingDown: true,
      saturated: false,
      currentTime: cooldown,
    });

    Services.get(ServiceType.CoroutineManager).beginCoroutine(this.owner, this.coSaturateEnchantButton(this.owner, enchantButton));

    enchantButton.on("clicked", _ => {
      if (enchantButton.getCurrentTime() !== 0 || enchantButton.isDestroyed()) {
        return;
      }

      // const target = enchantButton.getTarget(2);
      Services.get(ServiceType.Hud).displayNotification("DEBUG: BtnPress");
      enchantButton.reset();
    });

    this.catch("player.died", p => p.getPlayer()).execute(e => {
      Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, IMPERVIOUS_DEAD_STRING);
    });
  }

  * coSaturateEnchantButton(player: PlayerInstance, button: Button): Generator<void, void, number> {
    if (player.getLobby().getGameState() !== GameState.Started) {
      yield;
    }

    const animService = Services.get(ServiceType.Animation);
    let outlined = false;
    let lastTarget: PlayerInstance | undefined;

    while (true) {
      if (player.isDead()) {
        break;
      }

      if (button.getCurrentTime() !== 0 || button.isDestroyed()) {
        if (button.isSaturated()) {
          button.setSaturated(false);
        }

        yield;
        continue;
      }

      const target = button.getTarget(2);
      const isSaturated = button.isSaturated();

      if ((target === undefined) === isSaturated) {
        button.setSaturated(!isSaturated);
      }

      if ((target === undefined) === outlined || lastTarget !== target) {
        const players = this.owner.getLobby().getPlayers().filter(x => x !== this.owner);

        for (let i = 0; i < players.length; i++) {
          if (players[i] === target && !players[i].isDead()) {
            animService.setOutline(players[i], [45, 117, 49, 255], [this.owner.getSafeConnection()]);
          } else {
            animService.clearOutlineFor(players[i], this.owner.getSafeConnection());
          }
        }

        lastTarget = target;
        outlined = !outlined;
      }

      yield;
    }
  }

  getManagerType(): typeof BaseManager {
    return ImperviousManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Impervious",
      subtitle: "Enchant one of your fellow Crewmates",
      color: [45, 117, 49, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=${COLOR}>Role: Impervious
Enchant one of your fellow crewmates,\nto protect them.</color>`;
  }
}
