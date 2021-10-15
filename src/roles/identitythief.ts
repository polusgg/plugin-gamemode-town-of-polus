import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { BaseRole, RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { Vector2 } from "@nodepolus/framework/src/types";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { GameState } from "@nodepolus/framework/src/types/enums";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { getSpriteForRole } from "../..";
import { Player } from "@nodepolus/framework/src/player";

export class IdentityThiefManager extends BaseManager {
  getId(): string { return "identity_thief" }
  getTypeName(): string { return "Identity Thief" }
}

const COLOR = "#922152";

const IDENTITY_THIEF_DEAD_STRING = `<color=${COLOR}>Role: IdentityThief</color>
<color=#ff1919>You're dead, finish your tasks.</color>`;

export class IdentityThief extends Crewmate {
  public button: Button | undefined;
  protected metadata: RoleMetadata = {
    name: "Identity Thief",
    alignment: RoleAlignment.Neutral,
    preventBaseEmoji: true,
  };

  deadBodyLocations: [Vector2, Player][];

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${Services.get(ServiceType.Name).getFor(this.owner.getSafeConnection(), this.owner)}`);

      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, IDENTITY_THIEF_DEAD_STRING);
    });

    this.deadBodyLocations = [];
  }

  getNearestBodies() {
    return this.deadBodyLocations
      .filter(loc => loc[0].distance(this.owner.getPosition()) < 0.8)
      .sort((a, b) => a[0].distance(this.owner.getPosition()) - b[0].distance(this.owner.getPosition()));
  }

  *coSaturateStealButton(player: PlayerInstance, button: Button): Generator<void, void, number> {
    if (player.getLobby().getGameState() !== GameState.Started) {
      yield;
    }

    let wasInVent = false;

    while (true) {
      if (button.isCountingDown()) {
        yield;
      }

      //todo break out on custom predicate
      if (player.isDead()) {
        break;
      }

      const targets = this.getNearestBodies();

      const isSaturated = button.isSaturated();

      if ((this.owner.getVent() === undefined) === wasInVent) {
        if (!wasInVent) {
          button.setSaturated(false);
        }

        wasInVent = (this.owner.getVent() !== undefined);

        while (this.owner.getVent() !== undefined) {
          if (player.isDead()) {
            break;
          }

          yield;
        }
        continue;
      }

      if ((targets.length === 0) === isSaturated) {
        button.setSaturated(!isSaturated);
      }

      yield;
    }
  }

  async onReady(): Promise<void> {
    this.button = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")
        .getSafeAsset("Assets/Mods/TownOfPolus/Steal.png"),
      maxTimer: 10,
      position: new Vector2(-2.1, -0.7),
      alignment: EdgeAlignments.RightBottom,
      isCountingDown: true,
      saturated: false,
      currentTime: 10
    });

    this.catch("player.murdered", ev => ev.getPlayer().getLobby())
      .execute(ev => {
        this.deadBodyLocations.push([ev.getPlayer().getPosition(), ev.getPlayer() as Player]);
      });

    this.catch("player.died", ev => ev.getPlayer())
      .execute(ev => {
        this.button?.destroy();
      });

    Services.get(ServiceType.CoroutineManager).beginCoroutine(this.owner, this.coSaturateStealButton(this.owner, this.button));

    this.button.on("clicked", async () => {
      const targets = this.getNearestBodies();

      if (!this.button?.isSaturated() || targets.length < 1) {
        return;
      }

      const deadBody = targets[0];
      const player = deadBody[1];

      if (!player)
        return;

      this.button.destroy();

      const role = player.getMeta<BaseRole|undefined>("pgg.api.role");

      if (!role)
        return;

      await Services.get(ServiceType.Name).set(this.owner, this.owner.getName().toString().replace("<sprite index=23> ", ""));

      Services.get(ServiceType.RoleManager).assignRole(this.owner, (role as any).constructor, true);
    });
  }

  getManagerType(): typeof BaseManager {
    return IdentityThiefManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Identity Thief",
      subtitle: "Steal someone's identity",
      color: [146, 33, 82, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=${COLOR}>Role: IdentityThief
Finish your tasks.</color>`;
  }
}
