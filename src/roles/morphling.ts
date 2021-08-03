import { PlayerAnimationKeyframe } from "@polusgg/plugin-polusgg-api/src/services/animation/keyframes/player";
import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { TextComponent } from "@nodepolus/framework/src/api/text";
import { GameState, PlayerColor } from "@nodepolus/framework/src/types/enums";
import { Mutable, Vector2 } from "@nodepolus/framework/src/types";
import { TownOfPolusGameOptions } from "../..";
import { Palette } from "@nodepolus/framework/src/static";
import { TownOfPolusGameOptionNames } from "../types";
import { PlayerAnimationField } from "@polusgg/plugin-polusgg-api/src/types/playerAnimationFields";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { HudItem } from "@polusgg/plugin-polusgg-api/src/types/enums/hudItem";

export class MorphlingManager extends BaseManager {
  getId(): string { return "morphling" }
  getTypeName(): string { return "Morphling" }
}

const COLOR = "#40EB73";

const MORPHLING_DEAD_STRING = `<color=${COLOR}>Role: Morphling</color>
<color=#ff1919>You're dead.</color>
Fake Task:`;

class PlayerAppearance {
  constructor(
    public name: TextComponent,
    public hat: number,
    public pet: number,
    public skin: number,
    public color: number,
  ) {}

  static save(player: PlayerInstance): PlayerAppearance {
    return new PlayerAppearance(
      player.getName(),
      player.getHat(),
      player.getPet(),
      player.getSkin(),
      player.getColor(),
    );
  }

  apply(player: PlayerInstance): void {
    Services.get(ServiceType.Name).set(player, this.name.toString());
    player.setHat(this.hat);
    player.setPet(this.pet);
    player.setSkin(this.skin);
    // player.setColor(this.color);
  }
}

export class Morphling extends Impostor {
  public targetAppearance?: PlayerAppearance;
  public ownAppearance?: PlayerAppearance;
  public timeout?: NodeJS.Timeout;
  public transformed: boolean;
  public morphButton: Button | undefined;

  protected metadata: RoleMetadata = {
    name: "Morphling",
    alignment: RoleAlignment.Impostor,
  };

  constructor(owner: PlayerInstance) {
    super(owner);
    this.transformed = false;

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }

    this.catch("player.died", e => e.getPlayer()).execute(event => {
      Services.get(ServiceType.Hud).setHudString(event.getPlayer(), Location.TaskText, MORPHLING_DEAD_STRING);
    });
  }

  async onReady(): Promise<void> {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby());

    Services.get(ServiceType.Hud).setHudVisibility(this.owner, HudItem.VentButton, false);

    this.ownAppearance = PlayerAppearance.save(this.owner);

    this.morphButton = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Sample.png"),
      maxTimer: gameOptions.getOption(TownOfPolusGameOptionNames.MorphlingCooldown).getValue().value,
      position: new Vector2(2.1, 2.0),
      alignment: EdgeAlignments.RightBottom,
    });

    this.catch("player.died", event => event.getPlayer()).execute(_ => {
      if (this.morphButton === undefined) {
        return;
      }

      this.morphButton.getEntity().despawn();
      this.morphButton = undefined;
    });

    this.catch("meeting.ended", event => event.getGame())
      .execute(() => {
        if (this.morphButton) {
          this.morphButton.setCurrentTime(this.morphButton.getMaxTime());
        }
      });

    Services.get(ServiceType.CoroutineManager)
      .beginCoroutine(this.owner, this.coSaturateMorphlingButton(this.owner, this.morphButton));

    this.morphButton.on("clicked", async () => {
      if (this.morphButton === undefined || this.morphButton.getCurrentTime() !== 0 || this.transformed) {
        return;
      }

      if (this.targetAppearance === undefined) {
        const target = this.morphButton.getTarget(this.owner.getLobby().getOptions().getKillDistance() + 1);

        if (target !== undefined) {
          await Promise.allSettled(
            [
              this.morphButton.setColor(Palette.playerBody()[target.getColor()].dark as any),
              this.morphButton.setAsset(AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Morph.png")),
              this.morphButton.setCurrentTime(5),
            ],
          );
          this.targetAppearance = PlayerAppearance.save(target);
        }
      } else {
        await Promise.all([
          this.morphButton.setMaxTime(gameOptions.getOption(TownOfPolusGameOptionNames.MorphlingDuration).getValue().value),
          this.morphButton.setCurrentTime(gameOptions.getOption(TownOfPolusGameOptionNames.MorphlingDuration).getValue().value),
          this.morphButton.setSaturated(false),
        ]);
        this.transformed = true;
        await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.PrimaryColor, PlayerAnimationField.SecondaryColor], [
          new PlayerAnimationKeyframe({
            offset: 0,
            duration: 100,
            hatOpacity: 0,
            petOpacity: 0,
            skinOpacity: 0,
            primaryColor: [155, 155, 155, 255],
            secondaryColor: [155, 155, 155, 255],
          }),
        ], false);

        if (this.owner.getLobby().getMeetingHud() !== undefined) {
          return;
        }

        this.targetAppearance.apply(this.owner);
        await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.PrimaryColor, PlayerAnimationField.SecondaryColor], [
          new PlayerAnimationKeyframe({
            offset: 0,
            duration: 100,
            hatOpacity: 1,
            petOpacity: 1,
            skinOpacity: 1,
            primaryColor: Palette.playerBody()[this.targetAppearance!.color as PlayerColor].dark as Mutable<[number, number, number, number]>,
            secondaryColor: Palette.playerBody()[this.targetAppearance!.color as PlayerColor].light as Mutable<[number, number, number, number]>,
          }),
        ], false);

        this.timeout = setTimeout(async () => {
          await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.PrimaryColor, PlayerAnimationField.SecondaryColor], [
            new PlayerAnimationKeyframe({
              angle: 0,
              duration: 100,
              offset: 0,
              opacity: 0,
              position: Vector2.zero(),
              scale: Vector2.one(),
              primaryColor: [155, 155, 155, 255],
              secondaryColor: [155, 155, 155, 255],
            }),
          ], false);
          this.ownAppearance!.apply(this.owner);
          await await Services.get(ServiceType.Animation).beginPlayerAnimation(this.owner, [PlayerAnimationField.HatOpacity, PlayerAnimationField.PetOpacity, PlayerAnimationField.SkinOpacity, PlayerAnimationField.PrimaryColor, PlayerAnimationField.SecondaryColor], [
            new PlayerAnimationKeyframe({
              angle: 0,
              duration: 100,
              offset: 0,
              opacity: 1,
              position: Vector2.zero(),
              scale: Vector2.one(),
              primaryColor: Palette.playerBody()[this.ownAppearance!.color as PlayerColor].dark as Mutable<[number, number, number, number]>,
              secondaryColor: Palette.playerBody()[this.ownAppearance!.color as PlayerColor].light as Mutable<[number, number, number, number]>,
            }),
          ], false);
          this.transformed = false;
          await Promise.all([
            this.morphButton?.reset(),
            this.morphButton?.setSaturated(true),
          ]);
        }, gameOptions.getOption(TownOfPolusGameOptionNames.MorphlingDuration).getValue().value * 1000);
      }
    });

    this.catch("meeting.started", event => event.getGame())
      .where(() => !this.owner.isDead())
      .execute(() => {
        this.ownAppearance?.apply(this.owner);
        this.targetAppearance = undefined;
        // this.morphButton?.setColor([162, 18, 219, 0x7F]);
        this.morphButton?.setAsset(AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Sample.png"));
        this.morphButton?.setCurrentTime(5);
      });
  }

  * coSaturateMorphlingButton(player: PlayerInstance, button: Button): Generator<void, void, number> {
    if (player.getLobby().getGameState() !== GameState.Started) {
      yield;
    }

    while (true) {
      if (player.isDead()) {
        break;
      }

      if (this.targetAppearance !== undefined) {
        yield;
        continue;
      }

      const target = button.getTarget(this.owner.getLobby().getOptions().getKillDistance() + 1);

      const isSaturated = button.isSaturated();

      if ((target === undefined) === isSaturated) {
        button.setSaturated(!isSaturated);
      }
      yield;
    }
  }

  getManagerType(): typeof BaseManager {
    return MorphlingManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
    return {
      title: "Morphling",
      subtitle: "Transform and deceive the <color=#8CFFFFFF>Crewmates</color>",
      color: [64, 235, 115, 255],
    };
  }

  getDescriptionText(): string {
    return `<color=${COLOR}>Role: Morphling
Sabotage and kill the crewmates.
You have the ability to morph into\nsomeone else.</color>
Fake Tasks:`;
  }
}
