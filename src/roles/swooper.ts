import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Vector2 } from "@nodepolus/framework/src/types";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { PlayerRole } from "@nodepolus/framework/src/types/enums";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { PlayerAnimationField } from "@polusgg/plugin-polusgg-api/src/types/playerAnimationFields";
import { PlayerAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/player";
import { getSpriteForRole, TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";
import { HudItem } from "@polusgg/plugin-polusgg-api/src/types/enums/hudItem";

const COLOR = "#969696";

const SWOOPER_DEAD_STRING = `<color=${COLOR}>Role: Swooper</color>
<color=#ff1919>You're dead.</color>
Fake Task:`;

export class SwooperManager extends BaseManager {
  getId(): string { return "swooper" }
  getTypeName(): string { return "Swooper" }
}

export class Swooper extends Impostor {
  public swoopButton: Button | undefined;
  protected metadata: RoleMetadata = {
    name: "Swooper",
    alignment: RoleAlignment.Impostor,
  };

  async onReadyImpostor(): Promise<void> {
    await super.onReadyImpostor();

    if (this.owner.getConnection() !== undefined) {
      Services.get(ServiceType.Name).setFor(this.owner.getSafeConnection(), this.owner, `${getSpriteForRole(this)} ${this.owner.getName().toString()}`);

      Services.get(ServiceType.Resource).load(this.owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, SWOOPER_DEAD_STRING);
    });
  }

  async onReady(): Promise<void> {
    const roleManager = Services.get(ServiceType.RoleManager);
    const hudManager = Services.get(ServiceType.Hud);
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    const duration = gameOptions.getOption(TownOfPolusGameOptionNames.SwooperAbilityDuration).getValue().value;
    const cooldown = gameOptions.getOption(TownOfPolusGameOptionNames.SwooperCooldown).getValue().value;
    let timer: NodeJS.Timeout;

    roleManager.setBaseRole(this.owner, PlayerRole.Impostor);

    Services.get(ServiceType.Hud).setHudVisibility(this.owner, HudItem.VentButton, false);

    await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Swoop.png"),
      maxTimer: cooldown,
      position: new Vector2(2.1, 2.0),
      alignment: EdgeAlignments.RightBottom,
      currentTime: cooldown,
    }).then(async button => {
      await button.setSaturated(true);
      this.catch("player.died", event => event.getPlayer())
        .execute(async () => {
          button.destroy();
          await this.swoopBack();
          await hudManager.setHudString(this.owner, Location.RoomTracker, "__unset");
          clearInterval(timer);
        });
      this.catch("meeting.ended", event => event.getGame())
        .execute(async () => {
          await button.setCurrentTime(button.getMaxTime());
          await button.setSaturated(true);
          await this.swoopBack();
        });
      button.on("clicked", async () => {
        if (button.getCurrentTime() != 0 || !button.isSaturated() || button.isDestroyed()) {
          return;
        }

        button.reset();
        button.setSaturated(false);
        button.setCurrentTime(duration);
        await this.swoop();

        setTimeout(() => {
          this.swoopBack();
          button.setCurrentTime(button.getMaxTime());
          button.setSaturated(true);
        }, duration * 1000);
      });
    });
  }

  async swoop(): Promise<void> {
    await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.Opacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity], [
      new PlayerAnimationKeyframe({
        offset: 0,
        duration: 50,
        opacity: 0,
        petOpacity: 0,
      }),
    ], false, this.owner.getLobby().getConnections().filter(c => c !== this.owner.getSafeConnection()));

    await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.Opacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity], [
      new PlayerAnimationKeyframe({
        offset: 0,
        duration: 80,
        opacity: 0.3,
        petOpacity: 0.3,
      }),
    ], false, [this.owner.getSafeConnection()]);

    this.owner.setMeta("pgg.api.targetable", false);
  }

  async swoopBack(): Promise<void> {
    await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.Opacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity], [
      new PlayerAnimationKeyframe({
        offset: 0,
        duration: 80,
        opacity: 1,
        petOpacity: 1,
      }),
    ], false);

    this.owner.setMeta("pgg.api.targetable", true);
  }

  getManagerType(): typeof BaseManager {
    return SwooperManager;
  }

  getAssignmentScreen(_player: PlayerInstance, _impostorCount: number): StartGameScreenData {
    return {
      title: "Swooper",
      subtitle: `Use the Swoop ability to turn invisible`,
      color: [150, 150, 150, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=${COLOR}>Role: Swooper
Sabotage and kill the crewmates.
Use the Swoop ability to turn invisible.</color>
Fake Tasks:`;
  }
}
