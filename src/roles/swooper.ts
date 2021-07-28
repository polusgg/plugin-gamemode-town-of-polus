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
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";

const COLOR = "#969696";

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
      Services.get(ServiceType.Resource).load(this.owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  async onReady(): Promise<void> {
    const roleManager = Services.get(ServiceType.RoleManager);
    const hudManager = Services.get(ServiceType.Hud);
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());
    const duration = gameOptions.getOption(TownOfPolusGameOptionNames.SwooperAbilityDuration).getValue().value;
    const cooldown = gameOptions.getOption(TownOfPolusGameOptionNames.SwooperCooldown).getValue().value;
    let timer: NodeJS.Timeout;

    roleManager.setBaseRole(this.owner, PlayerRole.Impostor);

    await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Throw.png"),
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

        let timeElapsed = 0;

        await button.reset();
        await button.setSaturated(false);
        await button.setCurrentTime(0);
        await this.swoop();
        await hudManager.setHudString(this.owner, Location.RoomTracker, `You are <color=${COLOR}>invisible</color> for next ${duration - timeElapsed} second${(duration - timeElapsed) === 1 ? "" : "s"}`);
        timeElapsed += 1;

        timer = setInterval(async () => {
          if (timeElapsed >= duration) {
            await hudManager.setHudString(this.owner, Location.RoomTracker, "__unset");
            await this.swoopBack();
            await button.setCurrentTime(button.getMaxTime());
            await button.setSaturated(true);
            clearInterval(timer);
          } else {
            await hudManager.setHudString(this.owner, Location.RoomTracker, `You are <color=${COLOR}>invisible</color> for next ${duration - timeElapsed} second${(duration - timeElapsed) === 1 ? "" : "s"}`);
          }
          timeElapsed += 1;
        }, 1000);
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

    this.owner.setMeta("pgg.api.targetable", false);
  }

  getManagerType(): typeof BaseManager {
    return SwooperManager;
  }

  getAssignmentScreen(_player: PlayerInstance, _impostorCount: number): StartGameScreenData {
    return {
      title: "Swooper",
      subtitle: `Swoop`,
      color: [150, 150, 150, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=${COLOR}>Role: Swooper
Swoop</color>`;
  }
}